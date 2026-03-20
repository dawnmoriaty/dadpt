package domain

import "context"

type Repository interface {
	Create(ctx context.Context, bus *Bus) (*Bus, error)
	GetByID(ctx context.Context, id int32) (*Bus, error)
	List(ctx context.Context, filter *BusFilter) ([]*Bus, error)
	ListByProvider(ctx context.Context, filter *BusFilter) ([]*Bus, error)
	Count(ctx context.Context, filter *BusFilter) (int64, error)
	CountByProvider(ctx context.Context, filter *BusFilter) (int64, error)
	Update(ctx context.Context, id int32, bus *Bus) (*Bus, error)
	UpdateStatus(ctx context.Context, id int32, status string) (*Bus, error)
	Delete(ctx context.Context, id int32) error
}
