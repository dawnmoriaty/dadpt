package usecase

import (
	"context"
	"crypto/rand"
	"encoding/binary"
	"encoding/hex"
	"fmt"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"backend/configs"
	"backend/internals/booking/domain"
	paymentDomain "backend/internals/payment/domain"
	"backend/pkgs/logger"
)

const (
	bookingExpiry  = 10 * time.Minute // Pending booking expires after 10 minutes
	lockTTL        = 30 * time.Second // Redis lock TTL
	bookingCodeLen = 8                // Length of booking code
)

var seatCodePattern = regexp.MustCompile(`^([A-Za-z]+)(\d+)$`)

// Outbox event topics
const (
	TopicBookingCreated         = "booking.created"
	TopicBookingPaid            = "booking.paid"
	TopicBookingExpired         = "booking.expired"
	TopicBookingCancelled       = "booking.cancelled"
	TopicBookingRefundRequested = "booking.refund.requested"
	TopicBookingRefundApproved  = "booking.refund.approved"
	TopicBookingRefundRejected  = "booking.refund.rejected"
	TopicBookingStatusUpdated   = "booking.status.updated"
)

// IBookingUseCase defines the interface for booking use case
type IBookingUseCase interface {
	CreateBooking(ctx context.Context, input *domain.CreateBookingInput) (*domain.BookingOutput, error)
	GetBooking(ctx context.Context, id int64) (*domain.Booking, error)
	GetBookingByCode(ctx context.Context, code string) (*domain.Booking, error)
	GetPendingPaymentByBookingID(ctx context.Context, bookingID int64) (*domain.PaymentTransaction, error)
	GetLatestPaymentByBookingID(ctx context.Context, bookingID int64) (*domain.PaymentTransaction, error)
	ListUserBookings(ctx context.Context, input *domain.ListBookingsInput) (*domain.BookingListOutput, error)
	CancelBooking(ctx context.Context, input *domain.CancelBookingInput) (*domain.Booking, error)
	ConfirmPayment(ctx context.Context, input *domain.ConfirmPaymentInput) (*domain.PaymentConfirmOutput, error)
	GetPaymentByOrderCode(ctx context.Context, orderCode string) (*domain.PaymentTransaction, error)
	RegeneratePaymentLink(ctx context.Context, booking *domain.Booking, paymentTx *domain.PaymentTransaction) (*domain.BookingOutput, error)
	GatewayAvailable() bool
	ListAdminBookings(ctx context.Context, input *domain.AdminBookingListInput) (*domain.BookingListOutput, error)
	GetAdminBookingStats(ctx context.Context) (*domain.AdminBookingStatsOutput, error)
	GetTripSeatManifest(ctx context.Context, tripID int64) (*domain.TripSeatManifestOutput, error)
	GetAdminRevenueSeries(ctx context.Context, days int32) (*domain.AdminRevenueSeriesOutput, error)
	AdminUpdateBookingStatus(ctx context.Context, input *domain.AdminUpdateBookingStatusInput) (*domain.Booking, error)
	// Admin refund flow
	ListRefundRequests(ctx context.Context, input *domain.RefundRequestListInput) (*domain.RefundRequestListOutput, error)
	CountRefundPending(ctx context.Context) (int64, error)
	ApproveRefund(ctx context.Context, input *domain.RefundRequestInput) (*domain.Booking, error)
	RejectRefund(ctx context.Context, input *domain.RefundRequestInput) (*domain.Booking, error)
}

type bookingUseCase struct {
	repo        domain.Repository
	tripLocker  domain.TripLocker
	outboxRepo  domain.OutboxRepository
	paymentRepo domain.PaymentRepository
	lock        domain.DistributedLock
	paymentGw   paymentDomain.PaymentGateway // nil if not configured
	cfg         *configs.Config
}

// NewBookingUseCase creates a new booking use case
func NewBookingUseCase(
	repo domain.Repository,
	tripLocker domain.TripLocker,
	outboxRepo domain.OutboxRepository,
	paymentRepo domain.PaymentRepository,
	lock domain.DistributedLock,
	paymentGw paymentDomain.PaymentGateway,
	cfg *configs.Config,
) IBookingUseCase {
	return &bookingUseCase{
		repo:        repo,
		tripLocker:  tripLocker,
		outboxRepo:  outboxRepo,
		paymentRepo: paymentRepo,
		lock:        lock,
		paymentGw:   paymentGw,
		cfg:         cfg,
	}
}

// CreateBooking creates a new booking with race condition protection
func (u *bookingUseCase) CreateBooking(ctx context.Context, input *domain.CreateBookingInput) (*domain.BookingOutput, error) {
	if len(input.SeatCodes) == 0 {
		return nil, domain.ErrInvalidSeatCode
	}
	for i, seat := range input.SeatCodes {
		input.SeatCodes[i] = normalizeSeatCode(seat)
	}

	// 0. Validate consecutive seats (max 4, same row, sequential numbers)
	if err := domain.ValidateConsecutiveSeats(input.SeatCodes); err != nil {
		return nil, err
	}

	if input.UserID != nil {
		activeSeatCodes, err := u.repo.ListActiveSeatCodesByUserTrip(ctx, *input.UserID, input.TripID)
		if err != nil {
			return nil, fmt.Errorf("listing active seats per user trip: %w", err)
		}

		activeSeatSet := make(map[string]struct{}, len(activeSeatCodes))
		for _, seatCode := range activeSeatCodes {
			activeSeatSet[normalizeSeatCode(seatCode)] = struct{}{}
		}

		requestedNewSeats := 0
		for _, seatCode := range input.SeatCodes {
			if _, exists := activeSeatSet[seatCode]; exists {
				continue
			}
			requestedNewSeats += 1
		}

		if len(activeSeatSet)+requestedNewSeats > domain.MaxSeatsPerBooking {
			return nil, fmt.Errorf(
				"%w: maximum %d seats allowed per user per trip, current=%d, requested=%d",
				domain.ErrTooManySeats,
				domain.MaxSeatsPerBooking,
				len(activeSeatSet),
				requestedNewSeats,
			)
		}

		combinedSeatCodes := make([]string, 0, len(activeSeatSet)+len(input.SeatCodes))
		for seatCode := range activeSeatSet {
			combinedSeatCodes = append(combinedSeatCodes, seatCode)
		}
		for _, seatCode := range input.SeatCodes {
			if _, exists := activeSeatSet[seatCode]; exists {
				continue
			}
			combinedSeatCodes = append(combinedSeatCodes, seatCode)
		}

		if err := domain.ValidateConsecutiveSeats(combinedSeatCodes); err != nil {
			return nil, err
		}
	}

	// 1. Acquire Redis distributed lock - prevent thundering herd
	lockKey := fmt.Sprintf("booking:trip:%d", input.TripID)
	acquired, err := u.lock.Acquire(ctx, lockKey, lockTTL)
	if err != nil {
		logger.Error("Failed to acquire lock: %v", err)
		// Continue without lock in degraded mode
	}
	if !acquired {
		return nil, domain.ErrSeatsBeingBooked
	}
	defer func() {
		if err := u.lock.Release(ctx, lockKey); err != nil {
			logger.Warn("Failed to release lock: %v", err)
		}
	}()

	// 2. Lock trip row and validate (PostgreSQL FOR UPDATE NOWAIT)
	trip, err := u.tripLocker.LockTrip(ctx, input.TripID)
	if err != nil {
		return nil, err
	}

	// 3. Validate seats are available
	if !domain.SeatsAvailable(trip.BookedSeats, input.SeatCodes) {
		return nil, domain.ErrSeatsNotAvailable
	}

	// 4. Check enough available seats
	seatCount := int32(len(input.SeatCodes))
	if trip.AvailableSeats < seatCount {
		return nil, domain.ErrSeatsNotAvailable
	}

	// 5. Update trip seats atomically (optimistic locking with version)
	err = u.tripLocker.UpdateSeatsAtomic(ctx, input.TripID, input.SeatCodes, seatCount, trip.Version)
	if err != nil {
		return nil, err
	}

	// 6. Calculate total price
	totalAmount := domain.CalculatePrice(trip.BasePrice, trip.PriceModifier, int(seatCount))

	// 7. Generate booking code and order code
	bookingCode := generateBookingCode()
	orderCode := generateOrderCode()

	// 8. Create booking record with expiry
	booking := &domain.Booking{
		Code:          domain.BookingCode(bookingCode),
		TripID:        input.TripID,
		UserID:        input.UserID,
		GuestInfo:     input.GuestInfo,
		PickupInfo:    input.PickupInfo,
		DropoffInfo:   input.DropoffInfo,
		SeatCodes:     input.SeatCodes,
		TotalAmount:   totalAmount,
		Status:        domain.StatusPending,
		PaymentMethod: input.PaymentMethod,
		ExpiresAt:     time.Now().Add(u.cfg.BookingExpiryDuration),
	}

	// Validate booking entity
	if err := booking.Validate(); err != nil {
		// Rollback: release the seats
		_ = u.tripLocker.ReleaseSeats(ctx, input.TripID, input.SeatCodes, seatCount)
		return nil, err
	}

	created, err := u.repo.Create(ctx, booking)
	if err != nil {
		// Rollback: release the seats
		_ = u.tripLocker.ReleaseSeats(ctx, input.TripID, input.SeatCodes, seatCount)
		return nil, fmt.Errorf("creating booking: %w", err)
	}

	// 9. Create payment link via gateway (only for online methods)
	var checkoutURL, qrCode string
	paymentMethod := strings.TrimSpace(strings.ToLower(input.PaymentMethod))
	shouldCreatePaymentLink := u.paymentGw != nil && paymentMethod != "cod"
	if shouldCreatePaymentLink {
		orderCodeInt := orderCodeToInt64(orderCode)
		amountInt := int(totalAmount)
		desc := fmt.Sprintf("VE XE %s", bookingCode)
		expiresAt := booking.ExpiresAt.Unix()

		returnURL, cancelURL := u.resolvePayOSRedirectURLs(ctx)
		linkResult, err := u.paymentGw.CreatePaymentLink(ctx, orderCodeInt, amountInt, desc, expiresAt, returnURL, cancelURL)
		if err != nil {
			logger.Error("Failed to create payment link: %v", err)
		} else {
			checkoutURL = linkResult.CheckoutURL
			qrCode = linkResult.QRCode
			logger.Info("Payment link created: orderCode=%s, checkoutUrl=%s", orderCode, checkoutURL)
		}
	}

	if paymentMethod == "bank_transfer" && strings.TrimSpace(checkoutURL) == "" {
		_ = u.tripLocker.ReleaseSeats(ctx, input.TripID, input.SeatCodes, seatCount)
		_, _ = u.repo.UpdateStatus(ctx, created.ID, domain.StatusExpired)
		return nil, domain.ErrPaymentLinkUnavailable
	}

	// 10. Create payment transaction only for online methods
	if paymentMethod != "cod" {
		_, err = u.paymentRepo.CreateTransaction(ctx, &domain.PaymentTransaction{
			BookingID:     created.ID,
			OrderCode:     orderCode,
			Amount:        totalAmount,
			PaymentMethod: input.PaymentMethod,
			CheckoutURL:   checkoutURL,
			QRCode:        qrCode,
		})
		if err != nil {
			logger.Error("Failed to create payment transaction: %v", err)
			// Don't rollback booking — payment can be retried
		}
	} else {
		orderCode = ""
	}

	// 11. Create outbox event (transactional outbox pattern)
	correlationID := getCorrelationIDFromContext(ctx)
	eventPayload := domain.NewBookingEventEnvelope(TopicBookingCreated, created, correlationID)
	if err := u.outboxRepo.CreateEvent(ctx, TopicBookingCreated, eventPayload); err != nil {
		logger.Error("Failed to create outbox event: %v", err)
	}

	logger.Info("Booking created: code=%s, trip=%d, seats=%v, orderCode=%s", bookingCode, input.TripID, input.SeatCodes, orderCode)

	return &domain.BookingOutput{
		Booking:    created,
		TripInfo:   trip,
		OrderCode:  orderCode,
		PaymentURL: checkoutURL,
		QRCode:     qrCode,
	}, nil
}

func normalizeSeatCode(code string) string {
	trimmed := strings.TrimSpace(strings.ToUpper(code))
	matches := seatCodePattern.FindStringSubmatch(trimmed)
	if matches == nil {
		return trimmed
	}

	num, err := strconv.Atoi(matches[2])
	if err != nil {
		return trimmed
	}

	return fmt.Sprintf("%s%02d", matches[1], num)
}

func (u *bookingUseCase) resolvePayOSRedirectURLs(ctx context.Context) (string, string) {
	clientBaseURL := getClientBaseURL(ctx)
	if clientBaseURL == "" {
		return u.cfg.PayOSReturnURL, u.cfg.PayOSCancelURL
	}

	returnPath := "/payment/success"
	cancelPath := "/payment/cancel"

	if parsedReturnURL, err := url.Parse(u.cfg.PayOSReturnURL); err == nil && parsedReturnURL.Path != "" {
		returnPath = parsedReturnURL.Path
	}
	if parsedCancelURL, err := url.Parse(u.cfg.PayOSCancelURL); err == nil && parsedCancelURL.Path != "" {
		cancelPath = parsedCancelURL.Path
	}

	if returnPath == "/payment/success" {
		returnPath = "/my-bookings"
	}
	if cancelPath == "/payment/cancel" {
		cancelPath = "/my-bookings"
	}

	return strings.TrimRight(clientBaseURL, "/") + returnPath,
		strings.TrimRight(clientBaseURL, "/") + cancelPath
}

func (u *bookingUseCase) GetBooking(ctx context.Context, id int64) (*domain.Booking, error) {
	return u.repo.GetByID(ctx, id)
}

func (u *bookingUseCase) GetBookingByCode(ctx context.Context, code string) (*domain.Booking, error) {
	return u.repo.GetByCode(ctx, domain.BookingCode(code))
}

func (u *bookingUseCase) ListUserBookings(ctx context.Context, input *domain.ListBookingsInput) (*domain.BookingListOutput, error) {
	page := input.Page
	pageSize := input.PageSize
	limit := input.Limit
	offset := input.Offset

	if page > 0 {
		if pageSize <= 0 {
			pageSize = 10
		}
		limit = pageSize
		offset = (page - 1) * pageSize
	}

	if limit <= 0 {
		limit = 10
	}
	if offset < 0 {
		offset = 0
	}
	if page <= 0 {
		pageSize = limit
		page = (offset / limit) + 1
	}

	bookings, total, err := u.repo.ListByUser(ctx, input.UserID, limit, offset)
	if err != nil {
		return nil, err
	}
	return &domain.BookingListOutput{
		Bookings: bookings,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func (u *bookingUseCase) ListAdminBookings(ctx context.Context, input *domain.AdminBookingListInput) (*domain.BookingListOutput, error) {
	page := input.Page
	pageSize := input.PageSize
	limit := input.Limit
	offset := input.Offset

	if page > 0 {
		if pageSize <= 0 {
			pageSize = 10
		}
		limit = pageSize
		offset = (page - 1) * pageSize
	}

	if limit <= 0 {
		limit = 10
	}
	if offset < 0 {
		offset = 0
	}
	if page <= 0 {
		pageSize = limit
		page = (offset / limit) + 1
	}

	items, total, err := u.repo.ListAdmin(ctx, &domain.AdminBookingListInput{
		Limit:  limit,
		Offset: offset,
		Status: strings.TrimSpace(input.Status),
		TripID: input.TripID,
		Search: strings.TrimSpace(input.Search),
	})
	if err != nil {
		return nil, fmt.Errorf("uc.ListAdminBookings: %w", err)
	}

	return &domain.BookingListOutput{
		Bookings: items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func (u *bookingUseCase) GetAdminBookingStats(ctx context.Context) (*domain.AdminBookingStatsOutput, error) {
	stats, err := u.repo.GetAdminStats(ctx)
	if err != nil {
		return nil, fmt.Errorf("uc.GetAdminBookingStats: %w", err)
	}
	return stats, nil
}

func (u *bookingUseCase) GetTripSeatManifest(ctx context.Context, tripID int64) (*domain.TripSeatManifestOutput, error) {
	bookings, err := u.repo.ListActiveByTrip(ctx, tripID)
	if err != nil {
		return nil, fmt.Errorf("uc.GetTripSeatManifest: %w", err)
	}

	seatCount := int64(0)
	for _, booking := range bookings {
		if booking == nil {
			continue
		}
		seatCount += int64(len(booking.SeatCodes))
	}

	return &domain.TripSeatManifestOutput{
		TripID:    tripID,
		Bookings:  bookings,
		SeatCount: seatCount,
	}, nil
}

func (u *bookingUseCase) GetAdminRevenueSeries(ctx context.Context, days int32) (*domain.AdminRevenueSeriesOutput, error) {
	if days <= 0 {
		days = 7
	}

	items, err := u.repo.GetAdminRevenueSeries(ctx, days)
	if err != nil {
		return nil, fmt.Errorf("uc.GetAdminRevenueSeries: %w", err)
	}

	return &domain.AdminRevenueSeriesOutput{
		Days:  days,
		Items: items,
	}, nil
}

func (u *bookingUseCase) AdminUpdateBookingStatus(ctx context.Context, input *domain.AdminUpdateBookingStatusInput) (*domain.Booking, error) {
	booking, err := u.repo.GetByID(ctx, input.BookingID)
	if err != nil {
		return nil, err
	}

	if booking.Status == input.Status {
		return booking, nil
	}

	switch input.Status {
	case domain.StatusPaid:
		if booking.Status != domain.StatusPending {
			return nil, domain.ErrInvalidStatusTransition
		}
		updated, err := u.repo.MarkPaid(ctx, booking.ID)
		if err != nil {
			return nil, fmt.Errorf("uc.AdminUpdateBookingStatus: mark paid: %w", err)
		}
		_ = u.outboxRepo.CreateEvent(ctx, TopicBookingPaid, domain.NewBookingEventEnvelope(TopicBookingPaid, updated, getCorrelationIDFromContext(ctx)))
		return updated, nil

	case domain.StatusExpired:
		if booking.Status != domain.StatusPending {
			return nil, domain.ErrInvalidStatusTransition
		}
		seatCount := int32(len(booking.SeatCodes))
		if err := u.tripLocker.ReleaseSeats(ctx, booking.TripID, booking.SeatCodes, seatCount); err != nil {
			logger.Warn("Failed to release seats while expiring booking %d: %v", booking.ID, err)
		}
		updated, err := u.repo.MarkExpired(ctx, booking.ID)
		if err != nil {
			return nil, fmt.Errorf("uc.AdminUpdateBookingStatus: mark expired: %w", err)
		}
		_ = u.outboxRepo.CreateEvent(ctx, TopicBookingExpired, domain.NewBookingEventEnvelope(TopicBookingExpired, updated, getCorrelationIDFromContext(ctx)))
		return updated, nil

	case domain.StatusCancelled:
		if booking.Status != domain.StatusPending && booking.Status != domain.StatusPaid && booking.Status != domain.StatusRefundPending {
			return nil, domain.ErrInvalidStatusTransition
		}
		seatCount := int32(len(booking.SeatCodes))
		if err := u.tripLocker.ReleaseSeats(ctx, booking.TripID, booking.SeatCodes, seatCount); err != nil {
			logger.Warn("Failed to release seats while cancelling booking %d: %v", booking.ID, err)
		}
		updated, err := u.repo.UpdateStatus(ctx, booking.ID, domain.StatusCancelled)
		if err != nil {
			return nil, fmt.Errorf("uc.AdminUpdateBookingStatus: cancel booking: %w", err)
		}
		_ = u.outboxRepo.CreateEvent(ctx, TopicBookingCancelled, domain.NewBookingEventEnvelope(TopicBookingCancelled, updated, getCorrelationIDFromContext(ctx)))
		return updated, nil
	default:
		return nil, domain.ErrInvalidStatusTransition
	}
}

func (u *bookingUseCase) CancelBooking(ctx context.Context, input *domain.CancelBookingInput) (*domain.Booking, error) {
	// 1. Get booking
	booking, err := u.repo.GetByID(ctx, input.BookingID)
	if err != nil {
		return nil, err
	}

	// 2. Check authorization (if userID provided)
	if input.UserID != nil && booking.UserID != nil && *booking.UserID != *input.UserID {
		return nil, domain.ErrBookingNotFound // Don't reveal existence
	}

	// 3. Route to appropriate flow based on booking status
	switch booking.Status {
	case domain.StatusPending:
		return u.requestRefundForBooking(ctx, booking)
	case domain.StatusPaid:
		return u.requestRefundForBooking(ctx, booking)
	default:
		return nil, domain.ErrBookingCannotCancel
	}
}

// requestRefundForBooking marks booking as refund_pending for both pending and paid bookings.
// Actual cancellation/refund is finalized only after admin ApproveRefund.
func (u *bookingUseCase) requestRefundForBooking(ctx context.Context, booking *domain.Booking) (*domain.Booking, error) {
	if booking.Status == domain.StatusPaid && !booking.CanRequestRefund() {
		return nil, domain.ErrRefundWindowExpired
	}

	pending, err := u.repo.MarkRefundPending(ctx, booking.ID)
	if err != nil {
		return nil, fmt.Errorf("uc.requestRefundForBooking: marking refund pending: %w", err)
	}

	eventPayload := domain.NewBookingEventEnvelope(TopicBookingRefundRequested, pending, getCorrelationIDFromContext(ctx))
	if err := u.outboxRepo.CreateEvent(ctx, TopicBookingRefundRequested, eventPayload); err != nil {
		logger.Error("Failed to create outbox event for refund request: %v", err)
	}

	logger.Info("Refund requested: id=%d, code=%s, amount=%.2f (awaiting admin approval)", booking.ID, booking.Code, booking.TotalAmount)
	return pending, nil
}

// ListRefundRequests returns bookings with refund_pending status for admin review.
func (u *bookingUseCase) ListRefundRequests(ctx context.Context, input *domain.RefundRequestListInput) (*domain.RefundRequestListOutput, error) {
	page := input.Page
	pageSize := input.PageSize
	limit := input.Limit
	offset := input.Offset

	if page > 0 {
		if pageSize <= 0 {
			pageSize = 10
		}
		limit = pageSize
		offset = (page - 1) * pageSize
	}

	if limit <= 0 {
		limit = 10
	}
	if offset < 0 {
		offset = 0
	}
	if page <= 0 {
		pageSize = limit
		page = (offset / limit) + 1
	}

	bookings, total, err := u.repo.ListRefundPending(ctx, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("uc.ListRefundRequests: %w", err)
	}

	return &domain.RefundRequestListOutput{
		Bookings: bookings,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

// CountRefundPending returns the count of bookings in refund_pending status.
func (u *bookingUseCase) CountRefundPending(ctx context.Context) (int64, error) {
	count, err := u.repo.CountRefundPending(ctx)
	if err != nil {
		return 0, fmt.Errorf("uc.CountRefundPending: %w", err)
	}
	return count, nil
}

// ApproveRefund approves a refund request: simulate PayOS cancel, mark refunded, release seats.
func (u *bookingUseCase) ApproveRefund(ctx context.Context, input *domain.RefundRequestInput) (*domain.Booking, error) {
	// 1. Get booking and verify status
	booking, err := u.repo.GetByID(ctx, input.BookingID)
	if err != nil {
		return nil, err
	}

	if !booking.IsRefundPending() {
		return nil, domain.ErrBookingNotRefundPending
	}

	if strings.TrimSpace(input.ConfirmCode) != "" && strings.TrimSpace(strings.ToUpper(input.ConfirmCode)) != strings.TrimSpace(strings.ToUpper(string(booking.Code))) {
		return nil, domain.ErrRefundConfirmCodeMismatch
	}

	input.RefundReference = strings.TrimSpace(input.RefundReference)
	if input.RefundReference == "" {
		return nil, domain.ErrRefundReferenceRequired
	}
	if len(input.RefundReference) < 6 {
		return nil, domain.ErrInvalidRefundReference
	}
	if strings.EqualFold(input.RefundReference, string(booking.Code)) {
		return nil, domain.ErrInvalidRefundReference
	}

	// 2. Handle payment transaction if booking was paid
	if booking.Status == domain.StatusPaid {
		payment, err := u.paymentRepo.GetSuccessByBookingID(ctx, booking.ID)
		if err != nil {
			return nil, fmt.Errorf("uc.ApproveRefund: %w", err)
		}
		if strings.EqualFold(input.RefundReference, payment.OrderCode) {
			return nil, domain.ErrInvalidRefundReference
		}

		// 3. Simulate PayOS cancel (no sandbox available — log and skip real call)
		if u.paymentGw != nil && booking.PaymentMethod == "bank_transfer" {
			orderCodeInt := orderCodeToInt64(payment.OrderCode)
			reason := fmt.Sprintf("Admin approved refund for booking %s", booking.Code)
			logger.Info("[SIMULATED] PayOS CancelPaymentLink: orderCode=%d, reason=%s (skipped — no sandbox)", orderCodeInt, reason)
			// In production with real PayOS sandbox, uncomment the following:
			// if err := u.paymentGw.CancelPaymentLink(ctx, orderCodeInt, reason); err != nil {
			//     logger.Error("Failed to cancel payment link for booking %d: %v", booking.ID, err)
			//     return nil, fmt.Errorf("uc.ApproveRefund: cancelling payment: %w", err)
			// }
		}

		// 4. Mark payment transaction as refunded
		if _, err := u.paymentRepo.MarkRefunded(ctx, booking.ID); err != nil {
			logger.Error("Failed to mark payment refunded for booking %d: %v", booking.ID, err)
		}
	}

	// 5. Release seats
	seatCount := int32(len(booking.SeatCodes))
	if err := u.tripLocker.ReleaseSeats(ctx, booking.TripID, booking.SeatCodes, seatCount); err != nil {
		logger.Warn("Failed to release seats for refunded booking %d: %v", booking.ID, err)
	}

	// 6. Mark booking as refunded with admin confirmation metadata
	refunded, err := u.repo.MarkRefundedWithMeta(ctx, booking.ID, input.RefundReference, input.RefundNote)
	if err != nil {
		return nil, fmt.Errorf("uc.ApproveRefund: marking refunded: %w", err)
	}

	// 7. Simulated email notification to customer
	logger.Info("[SIMULATED EMAIL] To: %s <%s> | Subject: Hoàn tiền vé %s đã được duyệt | Body: Kính gửi %s, yêu cầu hoàn tiền cho vé %s (%.0f VND) đã được quản trị viên duyệt. Số tiền sẽ được hoàn về tài khoản của bạn trong 1-3 ngày làm việc.",
		booking.GuestInfo.Name, booking.GuestInfo.Email,
		booking.Code, booking.GuestInfo.Name, booking.Code, booking.TotalAmount)

	if err := u.outboxRepo.CreateEvent(ctx, TopicBookingRefundApproved, domain.NewBookingEventEnvelope(TopicBookingRefundApproved, refunded, getCorrelationIDFromContext(ctx))); err != nil {
		logger.Error("Failed to create outbox event for refund approval: %v", err)
	}

	logger.Info("Refund approved: id=%d, code=%s, amount=%.2f", booking.ID, booking.Code, booking.TotalAmount)
	return refunded, nil
}

// RejectRefund rejects a refund request: revert booking back to paid status.
func (u *bookingUseCase) RejectRefund(ctx context.Context, input *domain.RefundRequestInput) (*domain.Booking, error) {
	// 1. Get booking and verify status
	booking, err := u.repo.GetByID(ctx, input.BookingID)
	if err != nil {
		return nil, err
	}

	if !booking.IsRefundPending() {
		return nil, domain.ErrBookingNotRefundPending
	}

	if strings.TrimSpace(input.ConfirmCode) != "" && strings.TrimSpace(strings.ToUpper(input.ConfirmCode)) != strings.TrimSpace(strings.ToUpper(string(booking.Code))) {
		return nil, domain.ErrRefundConfirmCodeMismatch
	}

	// 2. Revert booking to paid
	reverted, err := u.repo.RevertToPaid(ctx, booking.ID)
	if err != nil {
		return nil, fmt.Errorf("uc.RejectRefund: reverting to paid: %w", err)
	}

	// 3. Simulated email notification to customer about rejection
	reason := input.Reason
	if reason == "" {
		reason = "Không đủ điều kiện hoàn tiền"
	}
	logger.Info("[SIMULATED EMAIL] To: %s <%s> | Subject: Yêu cầu hoàn tiền vé %s bị từ chối | Body: Kính gửi %s, yêu cầu hoàn tiền cho vé %s đã bị từ chối. Lý do: %s. Vé của bạn vẫn ở trạng thái đã thanh toán.",
		booking.GuestInfo.Name, booking.GuestInfo.Email,
		booking.Code, booking.GuestInfo.Name, booking.Code, reason)

	if err := u.outboxRepo.CreateEvent(ctx, TopicBookingRefundRejected, domain.NewBookingEventEnvelope(TopicBookingRefundRejected, reverted, getCorrelationIDFromContext(ctx))); err != nil {
		logger.Error("Failed to create outbox event for refund rejection: %v", err)
	}

	logger.Info("Refund rejected: id=%d, code=%s, reason=%s", booking.ID, booking.Code, input.Reason)
	return reverted, nil
}

// ConfirmPayment processes a payment webhook callback
func (u *bookingUseCase) ConfirmPayment(ctx context.Context, input *domain.ConfirmPaymentInput) (*domain.PaymentConfirmOutput, error) {
	// 1. Find payment transaction
	payment, err := u.paymentRepo.GetByOrderCode(ctx, input.OrderCode)
	if err != nil {
		return nil, err
	}

	// 2. Process based on webhook status
	switch input.Status {
	case "success":
		// Update payment → success
		updatedPayment, err := u.paymentRepo.MarkSuccess(ctx, input.OrderCode, input.WebhookData)
		if err != nil {
			return nil, err
		}

		// Update booking → paid
		updatedBooking, err := u.repo.MarkPaid(ctx, payment.BookingID)
		if err != nil {
			return nil, fmt.Errorf("marking booking paid: %w", err)
		}

		// Create outbox event for booking.paid
		eventPayload := domain.NewBookingEventEnvelope(TopicBookingPaid, updatedBooking, getCorrelationIDFromContext(ctx))
		if err := u.outboxRepo.CreateEvent(ctx, TopicBookingPaid, eventPayload); err != nil {
			logger.Error("Failed to create outbox event for payment: %v", err)
		}

		logger.Info("Payment confirmed: orderCode=%s, bookingId=%d", input.OrderCode, updatedBooking.ID)

		return &domain.PaymentConfirmOutput{
			Booking: updatedBooking,
			Payment: updatedPayment,
		}, nil

	case "failed", "cancelled":
		// Update payment → failed
		updatedPayment, err := u.paymentRepo.MarkFailed(ctx, input.OrderCode, input.WebhookData)
		if err != nil {
			return nil, err
		}

		// Release seats and expire booking
		booking, err := u.repo.GetByID(ctx, payment.BookingID)
		if err != nil {
			return nil, err
		}

		seatCount := int32(len(booking.SeatCodes))
		_ = u.tripLocker.ReleaseSeats(ctx, booking.TripID, booking.SeatCodes, seatCount)

		expiredBooking, err := u.repo.MarkExpired(ctx, booking.ID)
		if err != nil {
			logger.Warn("Failed to expire booking after failed payment: %v", err)
			return &domain.PaymentConfirmOutput{
				Booking: booking,
				Payment: updatedPayment,
			}, nil
		}

		logger.Info("Payment failed: orderCode=%s, bookingId=%d", input.OrderCode, booking.ID)

		return &domain.PaymentConfirmOutput{
			Booking: expiredBooking,
			Payment: updatedPayment,
		}, nil

	default:
		return nil, fmt.Errorf("unsupported payment status: %s", input.Status)
	}
}

// GetPaymentByOrderCode retrieves payment transaction by order code
func (u *bookingUseCase) GetPaymentByOrderCode(ctx context.Context, orderCode string) (*domain.PaymentTransaction, error) {
	return u.paymentRepo.GetByOrderCode(ctx, orderCode)
}

func (u *bookingUseCase) GetPendingPaymentByBookingID(ctx context.Context, bookingID int64) (*domain.PaymentTransaction, error) {
	return u.paymentRepo.GetPendingByBookingID(ctx, bookingID)
}

func (u *bookingUseCase) GetLatestPaymentByBookingID(ctx context.Context, bookingID int64) (*domain.PaymentTransaction, error) {
	return u.paymentRepo.GetLatestByBookingID(ctx, bookingID)
}

func (u *bookingUseCase) GatewayAvailable() bool {
	return u.paymentGw != nil
}

func (u *bookingUseCase) RegeneratePaymentLink(ctx context.Context, booking *domain.Booking, paymentTx *domain.PaymentTransaction) (*domain.BookingOutput, error) {
	if booking == nil || paymentTx == nil {
		return nil, domain.ErrPaymentNotFound
	}
	if booking.Status != domain.StatusPending {
		return nil, domain.ErrBookingNotPending
	}
	if u.paymentGw == nil {
		return nil, domain.ErrPaymentLinkUnavailable
	}

	returnURL, cancelURL := u.resolvePayOSRedirectURLs(ctx)
	linkResult, err := u.paymentGw.CreatePaymentLink(
		ctx,
		orderCodeToInt64(paymentTx.OrderCode),
		int(paymentTx.Amount),
		fmt.Sprintf("VE XE %s", booking.Code),
		booking.ExpiresAt.Unix(),
		returnURL,
		cancelURL,
	)
	if err != nil {
		return nil, fmt.Errorf("regenerating payment link: %w", err)
	}

	return &domain.BookingOutput{
		Booking:    booking,
		OrderCode:  paymentTx.OrderCode,
		PaymentURL: linkResult.CheckoutURL,
		QRCode:     linkResult.QRCode,
	}, nil
}

// =============================================================================
// HELPERS
// =============================================================================

func generateBookingCode() string {
	bytes := make([]byte, bookingCodeLen/2)
	rand.Read(bytes)
	return "VX" + strings.ToUpper(hex.EncodeToString(bytes))
}

// generateOrderCode generates a numeric order code as string (for PayOS int64 compatibility).
// Format: timestamp milliseconds + 3 random digits (ensures uniqueness).
func generateOrderCode() string {
	ts := time.Now().UnixMilli() % 9007199254740991 // PayOS max safe int
	rb := make([]byte, 2)
	rand.Read(rb)
	random := int(binary.BigEndian.Uint16(rb)) % 1000
	return fmt.Sprintf("%d%03d", ts, random)
}

func getCorrelationIDFromContext(ctx context.Context) string {
	v := ctx.Value("requestID")
	if id, ok := v.(string); ok {
		return id
	}
	return ""
}

// orderCodeToInt64 converts order code string to int64 for PayOS API.
func orderCodeToInt64(code string) int64 {
	var result int64
	fmt.Sscanf(code, "%d", &result)
	return result
}
