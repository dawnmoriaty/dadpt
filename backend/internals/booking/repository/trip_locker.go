package repository

import (
	"context"
	"fmt"
	"strings"

	"backend/db"
	"backend/internals/booking/domain"
	"backend/pkgs/utils"
	"backend/sql/models"
)

type tripLocker struct {
	db      *db.Database
	queries *models.Queries
}

// NewTripLocker creates a new trip locker for seat operations
func NewTripLocker(database *db.Database) domain.TripLocker {
	return &tripLocker{
		db:      database,
		queries: models.New(database.GetPool()),
	}
}

// =============================================================================
// TRIP LOCKER IMPLEMENTATION
// =============================================================================

func (t *tripLocker) LockTrip(ctx context.Context, tripID int64) (*domain.TripSnapshot, error) {
	trip, err := t.queries.LockTripForBooking(ctx, tripID)
	if err != nil {
		// Check if it's a lock not available error (NOWAIT)
		if strings.Contains(err.Error(), "could not obtain lock") {
			return nil, domain.ErrTripLocked
		}
		return nil, fmt.Errorf("locking trip: %w", err)
	}

	// Check if trip is bookable
	if utils.PtrToString(trip.Status) != "scheduled" {
		return nil, domain.ErrTripNotBookable
	}

	return &domain.TripSnapshot{
		ID:             trip.ID,
		ProviderID:     trip.ProviderID,
		BookedSeats:    trip.BookedSeats,
		AvailableSeats: trip.AvailableSeats,
		BasePrice:      utils.NumericToFloat64(trip.BasePrice),
		PriceModifier:  utils.NumericToFloat64(trip.PriceModifier),
		Version:        utils.PtrToInt32(trip.Version),
		Status:         utils.PtrToString(trip.Status),
	}, nil
}

func (t *tripLocker) UpdateSeatsAtomic(ctx context.Context, tripID int64, seatCodes []string, seatCount, version int32) error {
	_, err := t.queries.UpdateTripSeatsAtomic(ctx, models.UpdateTripSeatsAtomicParams{
		ID:             tripID,
		Column2:        seatCodes,
		AvailableSeats: seatCount,
		Version:        &version,
	})
	if err != nil {
		// If no rows affected, it means version mismatch or not enough seats
		if strings.Contains(err.Error(), "no rows") {
			return domain.ErrConcurrentModification
		}
		return fmt.Errorf("updating trip seats: %w", err)
	}
	return nil
}

func (t *tripLocker) ReleaseSeats(ctx context.Context, tripID int64, seatCodes []string, seatCount int32) error {
	_, err := t.queries.ReleaseTripSeats(ctx, models.ReleaseTripSeatsParams{
		ID:             tripID,
		Column2:        seatCodes,
		AvailableSeats: seatCount,
	})
	if err != nil {
		return fmt.Errorf("releasing trip seats: %w", err)
	}
	return nil
}
