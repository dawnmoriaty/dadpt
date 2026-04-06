package domain

import "context"

type Repository interface {
	Create(ctx context.Context, loc *Location) (*Location, error)
	GetByID(ctx context.Context, id int32) (*Location, error)
	Update(ctx context.Context, loc *Location) (*Location, error)
	Delete(ctx context.Context, id int32) error
	List(ctx context.Context, filter *LocationFilter) ([]*Location, error)
	Count(ctx context.Context, filter *LocationFilter) (int64, error)
	Search(ctx context.Context, query string, limit int32) ([]*Location, error)
}
