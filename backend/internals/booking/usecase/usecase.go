package usecase

import (
	"context"
	"crypto/rand"
	"encoding/binary"
	"encoding/hex"
	"fmt"
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
	ListUserBookings(ctx context.Context, input *domain.ListBookingsInput) (*domain.BookingListOutput, error)
	CancelBooking(ctx context.Context, input *domain.CancelBookingInput) (*domain.Booking, error)
	ConfirmPayment(ctx context.Context, input *domain.ConfirmPaymentInput) (*domain.PaymentConfirmOutput, error)
	GetPaymentByOrderCode(ctx context.Context, orderCode string) (*domain.PaymentTransaction, error)
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
	// 0. Validate consecutive seats (max 4, same row, sequential numbers)
	if err := domain.ValidateConsecutiveSeats(input.SeatCodes); err != nil {
		return nil, err
	}

	// 1. Acquire Redis distributed lock - prevent thundering herd
	lockKey := fmt.Sprintf("booking:trip:%d:seats:%s", input.TripID, strings.Join(input.SeatCodes, ","))
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

	// 9. Create payment transaction
	_, err = u.paymentRepo.CreateTransaction(ctx, &domain.PaymentTransaction{
		BookingID:     created.ID,
		OrderCode:     orderCode,
		Amount:        totalAmount,
		PaymentMethod: input.PaymentMethod,
	})
	if err != nil {
		logger.Error("Failed to create payment transaction: %v", err)
		// Don't rollback booking — payment can be retried
	}

	// 10. Create payment link via gateway (if configured and method requires it)
	var checkoutURL, qrCode string
	if u.paymentGw != nil {
		orderCodeInt := orderCodeToInt64(orderCode)
		amountInt := int(totalAmount)
		desc := fmt.Sprintf("VE XE %s", bookingCode)
		expiresAt := booking.ExpiresAt.Unix()

		linkResult, err := u.paymentGw.CreatePaymentLink(ctx, orderCodeInt, amountInt, desc, expiresAt)
		if err != nil {
			logger.Error("Failed to create payment link: %v", err)
		} else {
			checkoutURL = linkResult.CheckoutURL
			qrCode = linkResult.QRCode
			logger.Info("Payment link created: orderCode=%s, checkoutUrl=%s", orderCode, checkoutURL)
		}
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
			pageSize = 20
		}
		limit = pageSize
		offset = (page - 1) * pageSize
	}

	if limit <= 0 {
		limit = 20
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
		return u.cancelPendingBooking(ctx, booking)
	case domain.StatusPaid:
		return u.refundPaidBooking(ctx, booking)
	default:
		return nil, domain.ErrBookingCannotCancel
	}
}

// cancelPendingBooking cancels a booking that has not been paid yet.
func (u *bookingUseCase) cancelPendingBooking(ctx context.Context, booking *domain.Booking) (*domain.Booking, error) {
	// Release seats
	seatCount := int32(len(booking.SeatCodes))
	if err := u.tripLocker.ReleaseSeats(ctx, booking.TripID, booking.SeatCodes, seatCount); err != nil {
		logger.Warn("Failed to release seats for booking %d: %v", booking.ID, err)
		// Continue with cancellation
	}

	// Update booking status
	cancelled, err := u.repo.UpdateStatus(ctx, booking.ID, domain.StatusCancelled)
	if err != nil {
		return nil, fmt.Errorf("cancelling booking: %w", err)
	}

	if err := u.outboxRepo.CreateEvent(ctx, TopicBookingCancelled, domain.NewBookingEventEnvelope(TopicBookingCancelled, cancelled, getCorrelationIDFromContext(ctx))); err != nil {
		logger.Error("Failed to create outbox event for booking cancellation: %v", err)
	}

	logger.Info("Booking cancelled: id=%d, code=%s", booking.ID, booking.Code)
	return cancelled, nil
}

// refundPaidBooking creates a refund request for a paid booking within the refund window.
// The actual refund is processed when admin approves via ApproveRefund.
func (u *bookingUseCase) refundPaidBooking(ctx context.Context, booking *domain.Booking) (*domain.Booking, error) {
	// 1. Check refund eligibility (paid + within 5 min window)
	if !booking.CanRequestRefund() {
		return nil, domain.ErrRefundWindowExpired
	}

	// 2. Mark booking as refund_pending (awaiting admin approval)
	pending, err := u.repo.MarkRefundPending(ctx, booking.ID)
	if err != nil {
		return nil, fmt.Errorf("uc.refundPaidBooking: marking refund pending: %w", err)
	}

	// 3. Create outbox event for booking.refund.requested (admin notification)
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
			pageSize = 20
		}
		limit = pageSize
		offset = (page - 1) * pageSize
	}

	if limit <= 0 {
		limit = 20
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

	// 2. Get the successful payment transaction
	payment, err := u.paymentRepo.GetSuccessByBookingID(ctx, booking.ID)
	if err != nil {
		return nil, fmt.Errorf("uc.ApproveRefund: %w", err)
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

	// 5. Release seats
	seatCount := int32(len(booking.SeatCodes))
	if err := u.tripLocker.ReleaseSeats(ctx, booking.TripID, booking.SeatCodes, seatCount); err != nil {
		logger.Warn("Failed to release seats for refunded booking %d: %v", booking.ID, err)
	}

	// 6. Mark booking as refunded
	refunded, err := u.repo.MarkRefunded(ctx, booking.ID)
	if err != nil {
		return nil, fmt.Errorf("uc.ApproveRefund: marking refunded: %w", err)
	}

	// 7. Simulated email notification to customer
	logger.Info("[SIMULATED EMAIL] To: %s <%s> | Subject: Hoàn tiền vé %s đã được duyệt | Body: Kính gửi %s, yêu cầu hoàn tiền cho vé %s (%.0f VND) đã được quản trị viên duyệt. Số tiền sẽ được hoàn về tài khoản của bạn trong 1-3 ngày làm việc.",
		booking.GuestInfo.Name, booking.GuestInfo.Email,
		booking.Code, booking.GuestInfo.Name, booking.Code, booking.TotalAmount)

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
