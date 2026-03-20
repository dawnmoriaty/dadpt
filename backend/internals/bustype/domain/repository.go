package domain

import "context"

type Repository interface {
	Create(ctx context.Context, busType *BusType) (*BusType, error)
	GetByID(ctx context.Context, id int32) (*BusType, error)
	List(ctx context.Context, filter *BusTypeFilter) ([]*BusType, error)
	ListAll(ctx context.Context) ([]*BusType, error)
	Count(ctx context.Context, filter *BusTypeFilter) (int64, error)
	Update(ctx context.Context, id int32, busType *BusType) (*BusType, error)
	Delete(ctx context.Context, id int32) error
}
