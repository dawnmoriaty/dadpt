package repository

import (
	"context"
	"errors"
	"fmt"

	"backend/db"
	"backend/internals/bus/domain"
	"backend/pkgs/utils"
	"backend/sql/models"

	"github.com/jackc/pgx/v5"
)

type busRepository struct {
	queries *models.Queries
}

func NewBusRepository(database *db.Database) domain.Repository {
	return &busRepository{
		queries: models.New(database.GetPool()),
	}
}

func (r *busRepository) Create(ctx context.Context, bus *domain.Bus) (*domain.Bus, error) {
	status := bus.Status
	if status == "" {
		status = "active"
	}

	existLicensePlate, err := r.queries.BusExistsByLicensePlate(ctx, bus.LicensePlate)
	if err != nil {
		return nil, fmt.Errorf("busRepository.Create.BusExistsByLicensePlate: %w", err)
	}
	if existLicensePlate {
		return nil, domain.ErrBusLicensePlateAlreadyExists
	}
	row, err := r.queries.CreateBus(ctx, models.CreateBusParams{
		ProviderID:   bus.ProviderID,
		BusTypeID:    bus.BusTypeID,
		LicensePlate: bus.LicensePlate,
		Status:       &status,
		ImageUrl:     utils.StringToPtr(bus.ImageURL),
	})
	if err != nil {
		return nil, fmt.Errorf("busRepository.Create: %w", err)
	}
	return r.basicToDomain(&row), nil
}

func (r *busRepository) GetByID(ctx context.Context, id int32) (*domain.Bus, error) {
	row, err := r.queries.GetBusByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrBusNotFound
		}
		return nil, fmt.Errorf("busRepository.GetByID: %w", err)
	}
	return r.joinedToDomain(&row), nil
}

func (r *busRepository) List(ctx context.Context, filter *domain.BusFilter) ([]*domain.Bus, error) {
	params := models.ListBusesParams{
		Limit:  filter.Limit,
		Offset: filter.Offset,
	}
	if filter.Query != "" {
		q := filter.Query
		params.Q = &q
	}
	if filter.Status != "" {
		status := filter.Status
		params.Status = &status
	}
	if filter.ProviderID > 0 {
		providerID := filter.ProviderID
		params.ProviderID = &providerID
	}

	rows, err := r.queries.ListBuses(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("busRepository.List: %w", err)
	}

	result := make([]*domain.Bus, len(rows))
	for i, row := range rows {
		result[i] = r.listRowToDomain(&row)
	}
	return result, nil
}

func (r *busRepository) ListByProvider(ctx context.Context, filter *domain.BusFilter) ([]*domain.Bus, error) {
	rows, err := r.queries.ListBusesByProvider(ctx, models.ListBusesByProviderParams{
		ProviderID: filter.ProviderID,
		Limit:      filter.Limit,
		Offset:     filter.Offset,
		Q:          stringPtr(filter.Query),
		Status:     stringPtr(filter.Status),
	})
	if err != nil {
		return nil, fmt.Errorf("busRepository.ListByProvider: %w", err)
	}

	result := make([]*domain.Bus, len(rows))
	for i, row := range rows {
		result[i] = r.providerRowToDomain(&row)
	}
	return result, nil
}

func (r *busRepository) Count(ctx context.Context, filter *domain.BusFilter) (int64, error) {
	params := models.CountBusesParams{
		Q:      stringPtr(filter.Query),
		Status: stringPtr(filter.Status),
	}
	if filter.ProviderID > 0 {
		providerID := filter.ProviderID
		params.ProviderID = &providerID
	}

	count, err := r.queries.CountBuses(ctx, params)
	if err != nil {
		return 0, fmt.Errorf("busRepository.Count: %w", err)
	}
	return count, nil
}

func (r *busRepository) CountByProvider(ctx context.Context, filter *domain.BusFilter) (int64, error) {
	count, err := r.queries.CountBusesByProvider(ctx, models.CountBusesByProviderParams{
		ProviderID: filter.ProviderID,
		Q:          stringPtr(filter.Query),
		Status:     stringPtr(filter.Status),
	})
	if err != nil {
		return 0, fmt.Errorf("busRepository.CountByProvider: %w", err)
	}
	return count, nil
}

func (r *busRepository) Update(ctx context.Context, id int32, bus *domain.Bus) (*domain.Bus, error) {
	row, err := r.queries.UpdateBus(ctx, models.UpdateBusParams{
		ID:           id,
		BusTypeID:    bus.BusTypeID,
		LicensePlate: bus.LicensePlate,
		Status:       &bus.Status,
		ImageUrl:     utils.StringToPtr(bus.ImageURL),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrBusNotFound
		}
		return nil, fmt.Errorf("busRepository.Update: %w", err)
	}
	return r.basicToDomain(&row), nil
}

func (r *busRepository) UpdateStatus(ctx context.Context, id int32, status string) (*domain.Bus, error) {
	row, err := r.queries.UpdateBusStatus(ctx, models.UpdateBusStatusParams{
		ID:     id,
		Status: &status,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrBusNotFound
		}
		return nil, fmt.Errorf("busRepository.UpdateStatus: %w", err)
	}
	return r.basicToDomain(&row), nil
}

func (r *busRepository) Delete(ctx context.Context, id int32) error {
	err := r.queries.DeleteBus(ctx, id)
	if err != nil {
		return fmt.Errorf("busRepository.Delete: %w", err)
	}
	return nil
}

func (r *busRepository) basicToDomain(m *models.Bus) *domain.Bus {
	return &domain.Bus{
		ID:           m.ID,
		ProviderID:   m.ProviderID,
		BusTypeID:    m.BusTypeID,
		LicensePlate: m.LicensePlate,
		Status:       utils.PtrToString(m.Status),
		ImageURL:     utils.PtrToString(m.ImageUrl),
	}
}

func (r *busRepository) joinedToDomain(m *models.GetBusByIDRow) *domain.Bus {
	return &domain.Bus{
		ID:           m.ID,
		ProviderID:   m.ProviderID,
		BusTypeID:    m.BusTypeID,
		LicensePlate: m.LicensePlate,
		Status:       utils.PtrToString(m.Status),
		ImageURL:     utils.PtrToString(m.ImageUrl),
		BusTypeName:  m.BusTypeName,
		TotalSeats:   m.TotalSeats,
		ProviderName: m.ProviderName,
	}
}

func (r *busRepository) listRowToDomain(m *models.ListBusesRow) *domain.Bus {
	return &domain.Bus{
		ID:           m.ID,
		ProviderID:   m.ProviderID,
		BusTypeID:    m.BusTypeID,
		LicensePlate: m.LicensePlate,
		Status:       utils.PtrToString(m.Status),
		ImageURL:     utils.PtrToString(m.ImageUrl),
		BusTypeName:  m.BusTypeName,
		TotalSeats:   m.TotalSeats,
		ProviderName: m.ProviderName,
	}
}

func (r *busRepository) providerRowToDomain(m *models.ListBusesByProviderRow) *domain.Bus {
	return &domain.Bus{
		ID:           m.ID,
		ProviderID:   m.ProviderID,
		BusTypeID:    m.BusTypeID,
		LicensePlate: m.LicensePlate,
		Status:       utils.PtrToString(m.Status),
		ImageURL:     utils.PtrToString(m.ImageUrl),
		BusTypeName:  m.BusTypeName,
		TotalSeats:   m.TotalSeats,
		ProviderName: m.ProviderName,
	}
}

func stringPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
