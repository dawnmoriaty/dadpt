package domain

import "context"

type Repository interface {
	Create(ctx context.Context, bus *Bus) (*Bus, error)
	GetByID(ctx context.Context, id int32) (*Bus, error)
	List(ctx context.Context, limit, offset int32) ([]*Bus, error)
	ListByProvider(ctx context.Context, providerID int32, limit, offset int32) ([]*Bus, error)
	Count(ctx context.Context) (int64, error)
	CountByProvider(ctx context.Context, providerID int32) (int64, error)
	Update(ctx context.Context, id int32, bus *Bus) (*Bus, error)
	UpdateStatus(ctx context.Context, id int32, status string) (*Bus, error)
	Delete(ctx context.Context, id int32) error
}
