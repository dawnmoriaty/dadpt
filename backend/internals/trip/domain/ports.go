package domain

import "context"

// Repository defines the port for trip persistence
type Repository interface {
	Create(ctx context.Context, trip *Trip) (*Trip, error)
	GetByID(ctx context.Context, id int64) (*Trip, error)
	Update(ctx context.Context, trip *Trip) (*Trip, error)
	UpdateStatus(ctx context.Context, id int64, status TripStatus) (*Trip, error)
	Delete(ctx context.Context, id int64) error
	List(ctx context.Context, filter *TripFilter) ([]*Trip, int64, error)
	Search(ctx context.Context, filter *TripFilter) ([]*Trip, int64, error)
	CountActiveBookings(ctx context.Context, tripID int64) (int64, error)
}
