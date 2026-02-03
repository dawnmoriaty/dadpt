package repository

import (
	"context"

	"backend/db"
	"backend/internals/bustype/domain"
	"backend/sql/models"
)

type BusTypeRepository struct {
	db      *db.Database
	queries *models.Queries
}

func NewBusTypeRepository(database *db.Database) *BusTypeRepository {
	return &BusTypeRepository{
		db:      database,
		queries: models.New(database.GetPool()),
	}
}

func (r *BusTypeRepository) Create(ctx context.Context, busType *domain.BusType) (*domain.BusType, error) {
	row, err := r.queries.CreateBusType(ctx, models.CreateBusTypeParams{
		Name:       busType.Name,
		TotalSeats: busType.TotalSeats,
		SeatLayout: busType.SeatLayout,
	})
	if err != nil {
		return nil, err
	}
	return r.toDomain(&row), nil
}

func (r *BusTypeRepository) GetByID(ctx context.Context, id int32) (*domain.BusType, error) {
	row, err := r.queries.GetBusTypeByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return r.toDomain(&row), nil
}

func (r *BusTypeRepository) List(ctx context.Context, limit, offset int32) ([]*domain.BusType, error) {
	rows, err := r.queries.ListBusTypes(ctx, models.ListBusTypesParams{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return nil, err
	}

	result := make([]*domain.BusType, len(rows))
	for i, row := range rows {
		result[i] = r.toDomain(&row)
	}
	return result, nil
}

func (r *BusTypeRepository) Count(ctx context.Context) (int64, error) {
	return r.queries.CountBusTypes(ctx)
}

func (r *BusTypeRepository) Update(ctx context.Context, id int32, busType *domain.BusType) (*domain.BusType, error) {
	row, err := r.queries.UpdateBusType(ctx, models.UpdateBusTypeParams{
		ID:         id,
		Name:       busType.Name,
		TotalSeats: busType.TotalSeats,
		SeatLayout: busType.SeatLayout,
	})
	if err != nil {
		return nil, err
	}
	return r.toDomain(&row), nil
}

func (r *BusTypeRepository) Delete(ctx context.Context, id int32) error {
	return r.queries.DeleteBusType(ctx, id)
}

func (r *BusTypeRepository) toDomain(m *models.BusType) *domain.BusType {
	return &domain.BusType{
		ID:         m.ID,
		Name:       m.Name,
		TotalSeats: m.TotalSeats,
		SeatLayout: m.SeatLayout,
	}
}
