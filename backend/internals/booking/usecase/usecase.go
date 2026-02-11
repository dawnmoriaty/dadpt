package usecase

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"backend/configs"
	"backend/internals/booking/domain"
	"backend/pkgs/logger"
)

const (
	bookingExpiry  = 15 * time.Minute // Pending booking expires after 15 minutes
	lockTTL        = 30 * time.Second // Redis lock TTL
	bookingCodeLen = 8                // Length of booking code
)

// Outbox event topics
const (
	TopicBookingCreated = "booking.created"
	TopicBookingPaid    = "booking.paid"
	TopicBookingExpired = "booking.expired"
)

// IBookingUseCase defines the interface for booking use case
type IBookingUseCase interface {
	CreateBooking(ctx context.Context, input *domain.CreateBookingInput) (*domain.BookingOutput, error)
	GetBooking(ctx context.Context, id int64) (*domain.Booking, error)
	GetBookingByCode(ctx context.Context, code string) (*domain.Booking, error)
	ListUserBookings(ctx context.Context, input *domain.ListBookingsInput) (*domain.BookingListOutput, error)
	CancelBooking(ctx context.Context, input *domain.CancelBookingInput) (*domain.Booking, error)
	ConfirmPayment(ctx context.Context, input *domain.ConfirmPaymentInput) (*domain.PaymentConfirmOutput, error)
}

type bookingUseCase struct {
	repo        domain.Repository
	tripLocker  domain.TripLocker
	outboxRepo  domain.OutboxRepository
	paymentRepo domain.PaymentRepository
	lock        domain.DistributedLock
	cfg         *configs.Config
}

// NewBookingUseCase creates a new booking use case
func NewBookingUseCase(
	repo domain.Repository,
	tripLocker domain.TripLocker,
	outboxRepo domain.OutboxRepository,
	paymentRepo domain.PaymentRepository,
	lock domain.DistributedLock,
	cfg *configs.Config,
) IBookingUseCase {
	return &bookingUseCase{
		repo:        repo,
		tripLocker:  tripLocker,
		outboxRepo:  outboxRepo,
		paymentRepo: paymentRepo,
		lock:        lock,
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
		ExpiresAt:     time.Now().Add(bookingExpiry),
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

	// 10. Create outbox event (transactional outbox pattern)
	eventPayload, _ := json.Marshal(map[string]interface{}{
		"eventType": TopicBookingCreated,
		"bookingId": created.ID,
		"code":      string(created.Code),
		"tripId":    created.TripID,
		"seatCodes": created.SeatCodes,
		"amount":    created.TotalAmount,
		"status":    string(created.Status),
		"orderCode": orderCode,
	})
	if err := u.outboxRepo.CreateEvent(ctx, TopicBookingCreated, eventPayload); err != nil {
		logger.Error("Failed to create outbox event: %v", err)
	}

	logger.Info("Booking created: code=%s, trip=%d, seats=%v, orderCode=%s", bookingCode, input.TripID, input.SeatCodes, orderCode)

	return &domain.BookingOutput{
		Booking:   created,
		TripInfo:  trip,
		OrderCode: orderCode,
	}, nil
}

func (u *bookingUseCase) GetBooking(ctx context.Context, id int64) (*domain.Booking, error) {
	return u.repo.GetByID(ctx, id)
}

func (u *bookingUseCase) GetBookingByCode(ctx context.Context, code string) (*domain.Booking, error) {
	return u.repo.GetByCode(ctx, domain.BookingCode(code))
}

func (u *bookingUseCase) ListUserBookings(ctx context.Context, input *domain.ListBookingsInput) (*domain.BookingListOutput, error) {
	bookings, total, err := u.repo.ListByUser(ctx, input.UserID, input.Limit, input.Offset)
	if err != nil {
		return nil, err
	}
	return &domain.BookingListOutput{
		Bookings: bookings,
		Total:    total,
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

	// 3. Check if can be cancelled
	if !booking.CanBeCancelled() {
		return nil, domain.ErrBookingCannotCancel
	}

	// 4. Release seats
	seatCount := int32(len(booking.SeatCodes))
	if err := u.tripLocker.ReleaseSeats(ctx, booking.TripID, booking.SeatCodes, seatCount); err != nil {
		logger.Warn("Failed to release seats for booking %d: %v", booking.ID, err)
		// Continue with cancellation
	}

	// 5. Update booking status
	cancelled, err := u.repo.UpdateStatus(ctx, booking.ID, domain.StatusCancelled)
	if err != nil {
		return nil, fmt.Errorf("cancelling booking: %w", err)
	}

	logger.Info("Booking cancelled: id=%d, code=%s", booking.ID, booking.Code)
	return cancelled, nil
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
		eventPayload, _ := json.Marshal(map[string]interface{}{
			"eventType": TopicBookingPaid,
			"bookingId": updatedBooking.ID,
			"code":      string(updatedBooking.Code),
			"tripId":    updatedBooking.TripID,
			"seatCodes": updatedBooking.SeatCodes,
			"amount":    updatedBooking.TotalAmount,
			"status":    string(updatedBooking.Status),
			"orderCode": input.OrderCode,
		})
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

// =============================================================================
// HELPERS
// =============================================================================

func generateBookingCode() string {
	bytes := make([]byte, bookingCodeLen/2)
	rand.Read(bytes)
	return "VX" + strings.ToUpper(hex.EncodeToString(bytes))
}

func generateOrderCode() string {
	bytes := make([]byte, 8)
	rand.Read(bytes)
	return "PAY" + strings.ToUpper(hex.EncodeToString(bytes))
}
