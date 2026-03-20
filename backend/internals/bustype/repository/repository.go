package repository

import (
	"context"
	"errors"
	"fmt"

	"backend/db"
	"backend/internals/bustype/domain"
	"backend/sql/models"

	"github.com/jackc/pgx/v5"
	"golang.org/x/sync/errgroup"
)

type busTypeRepository struct {
	queries *models.Queries
}

func NewBusTypeRepository(database *db.Database) domain.Repository {
	return &busTypeRepository{
		queries: models.New(database.GetPool()),
	}
}

func (r *busTypeRepository) Create(ctx context.Context, busType *domain.BusType) (*domain.BusType, error) {
	row, err := r.queries.CreateBusType(ctx, models.CreateBusTypeParams{
		Name:       busType.Name,
		TotalSeats: busType.TotalSeats,
		SeatLayout: busType.SeatLayout,
	})
	if err != nil {
		return nil, fmt.Errorf("busTypeRepository.Create: %w", err)
	}
	return r.toDomain(&row), nil
}

func (r *busTypeRepository) GetByID(ctx context.Context, id int32) (*domain.BusType, error) {
	row, err := r.queries.GetBusTypeByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrBusTypeNotFound
		}
		return nil, fmt.Errorf("busTypeRepository.GetByID: %w", err)
	}
	return r.toDomain(&row), nil
}

func (r *busTypeRepository) List(ctx context.Context, filter *domain.BusTypeFilter) ([]*domain.BusType, error) {
	params := models.ListBusTypesParams{
		Limit:  filter.Limit,
		Offset: filter.Offset,
	}
	if filter.Query != "" {
		q := filter.Query
		params.Q = &q
	}

	rows, err := r.queries.ListBusTypes(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("busTypeRepository.List: %w", err)
	}

	result := make([]*domain.BusType, len(rows))
	for i, row := range rows {
		result[i] = r.toDomain(&row)
	}
	return result, nil
}

func (r *busTypeRepository) Count(ctx context.Context, filter *domain.BusTypeFilter) (int64, error) {
	var q *string
	if filter != nil && filter.Query != "" {
		query := filter.Query
		q = &query
	}

	count, err := r.queries.CountBusTypes(ctx, q)
	if err != nil {
		return 0, fmt.Errorf("busTypeRepository.Count: %w", err)
	}
	return count, nil
}

func (r *busTypeRepository) ListAndCount(ctx context.Context, filter *domain.BusTypeFilter) ([]*domain.BusType, int64, error) {
	var (
		items []*domain.BusType
		total int64
	)

	g, gctx := errgroup.WithContext(ctx)
	g.Go(func() error {
		rows, err := r.List(gctx, filter)
		if err != nil {
			return fmt.Errorf("busTypeRepository.ListAndCount.List: %w", err)
		}
		items = rows
		return nil
	})
	g.Go(func() error {
		count, err := r.Count(gctx, filter)
		if err != nil {
			return fmt.Errorf("busTypeRepository.ListAndCount.Count: %w", err)
		}
		total = count
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func (r *busTypeRepository) Update(ctx context.Context, id int32, busType *domain.BusType) (*domain.BusType, error) {
	row, err := r.queries.UpdateBusType(ctx, models.UpdateBusTypeParams{
		ID:         id,
		Name:       busType.Name,
		TotalSeats: busType.TotalSeats,
		SeatLayout: busType.SeatLayout,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrBusTypeNotFound
		}
		return nil, fmt.Errorf("busTypeRepository.Update: %w", err)
	}
	return r.toDomain(&row), nil
}

func (r *busTypeRepository) Delete(ctx context.Context, id int32) error {
	err := r.queries.DeleteBusType(ctx, id)
	if err != nil {
		return fmt.Errorf("busTypeRepository.Delete: %w", err)
	}
	return nil
}

func (r *busTypeRepository) ListAll(ctx context.Context) ([]*domain.BusType, error) {
	rows, err := r.queries.ListBusTypesPublic(ctx)
	if err != nil {
		return nil, fmt.Errorf("busTypeRepository.ListAll: %w", err)
	}
	result := make([]*domain.BusType, len(rows))
	for i, row := range rows {
		result[i] = r.toDomain(&row)
	}
	return result, nil
}

func (r *busTypeRepository) toDomain(m *models.BusType) *domain.BusType {
	return &domain.BusType{
		ID:         m.ID,
		Name:       m.Name,
		TotalSeats: m.TotalSeats,
		SeatLayout: m.SeatLayout,
	}
}
