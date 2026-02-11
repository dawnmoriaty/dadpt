package usecase

import (
	"context"
	"encoding/json"
	"time"

	"backend/internals/booking/domain"
	"backend/pkgs/logger"
)

const (
	expiryCheckInterval = 60 * time.Second
	expiryBatchSize     = int32(50)
)

type ExpiryWorker struct {
	repo       domain.Repository
	tripLocker domain.TripLocker
	outboxRepo domain.OutboxRepository
}

func NewExpiryWorker(
	repo domain.Repository,
	tripLocker domain.TripLocker,
	outboxRepo domain.OutboxRepository,
) *ExpiryWorker {
	return &ExpiryWorker{
		repo:       repo,
		tripLocker: tripLocker,
		outboxRepo: outboxRepo,
	}
}

func (w *ExpiryWorker) Start(ctx context.Context) {
	logger.Info("Expiry worker started (interval=%s)", expiryCheckInterval)

	w.processExpired(ctx)

	ticker := time.NewTicker(expiryCheckInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			logger.Info("Expiry worker stopped")
			return
		case <-ticker.C:
			w.processExpired(ctx)
		}
	}
}

func (w *ExpiryWorker) processExpired(ctx context.Context) {
	bookings, err := w.repo.GetExpiredPending(ctx, expiryBatchSize)
	if err != nil {
		logger.Error("Expiry worker: failed to get expired bookings: %v", err)
		return
	}

	if len(bookings) == 0 {
		return
	}

	expiredCount := 0
	for _, booking := range bookings {
		if err := w.expireBooking(ctx, booking); err != nil {
			logger.Error("Expiry worker: failed to expire booking %d: %v", booking.ID, err)
			continue
		}
		expiredCount++
	}

	if expiredCount > 0 {
		logger.Info("Expiry worker: expired %d bookings", expiredCount)
	}
}

func (w *ExpiryWorker) expireBooking(ctx context.Context, booking *domain.Booking) error {
	// 1. Release seats back to trip
	seatCount := int32(len(booking.SeatCodes))
	if err := w.tripLocker.ReleaseSeats(ctx, booking.TripID, booking.SeatCodes, seatCount); err != nil {
		logger.Warn("Expiry worker: failed to release seats for booking %d: %v", booking.ID, err)
		// Continue — marking expired is more important
	}

	// 2. Mark booking as expired
	_, err := w.repo.MarkExpired(ctx, booking.ID)
	if err != nil {
		return err
	}

	// 3. Create outbox event
	eventPayload, _ := json.Marshal(map[string]interface{}{
		"eventType": TopicBookingExpired,
		"bookingId": booking.ID,
		"code":      string(booking.Code),
		"tripId":    booking.TripID,
		"seatCodes": booking.SeatCodes,
		"amount":    booking.TotalAmount,
		"status":    "expired",
	})
	if err := w.outboxRepo.CreateEvent(ctx, TopicBookingExpired, eventPayload); err != nil {
		logger.Error("Expiry worker: failed to create outbox event for booking %d: %v", booking.ID, err)
	}

	logger.Info("Booking expired: id=%d, code=%s, seats=%v released", booking.ID, booking.Code, booking.SeatCodes)
	return nil
}
