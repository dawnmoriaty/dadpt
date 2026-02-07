package usecase

import (
	"context"
	"crypto/rand"
	"encoding/hex"
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

// IBookingUseCase defines the interface for booking use case
type IBookingUseCase interface {
	CreateBooking(ctx context.Context, input *domain.CreateBookingInput) (*domain.BookingOutput, error)
	GetBooking(ctx context.Context, id int64) (*domain.Booking, error)
	GetBookingByCode(ctx context.Context, code string) (*domain.Booking, error)
	ListUserBookings(ctx context.Context, input *domain.ListBookingsInput) (*domain.BookingListOutput, error)
	CancelBooking(ctx context.Context, input *domain.CancelBookingInput) (*domain.Booking, error)
}

type bookingUseCase struct {
	repo       domain.Repository
	tripLocker domain.TripLocker
	lock       domain.DistributedLock
	cfg        *configs.Config
}

// NewBookingUseCase creates a new booking use case
func NewBookingUseCase(
	repo domain.Repository,
	tripLocker domain.TripLocker,
	lock domain.DistributedLock,
	cfg *configs.Config,
) IBookingUseCase {
	return &bookingUseCase{
		repo:       repo,
		tripLocker: tripLocker,
		lock:       lock,
		cfg:        cfg,
	}
}

// CreateBooking creates a new booking with race condition protection
func (u *bookingUseCase) CreateBooking(ctx context.Context, input *domain.CreateBookingInput) (*domain.BookingOutput, error) {
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

	// 7. Generate booking code
	bookingCode := generateBookingCode()

	// 8. Create booking record
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

	logger.Info("Booking created: code=%s, trip=%d, seats=%v", bookingCode, input.TripID, input.SeatCodes)

	return &domain.BookingOutput{
		Booking:  created,
		TripInfo: trip,
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

// =============================================================================
// HELPERS
// =============================================================================

func generateBookingCode() string {
	bytes := make([]byte, bookingCodeLen/2)
	rand.Read(bytes)
	return "VX" + strings.ToUpper(hex.EncodeToString(bytes))
}
