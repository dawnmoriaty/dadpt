package repository

import (
	"context"

	"backend/db"
	"backend/internals/bus/domain"
	"backend/pkgs/utils"
	"backend/sql/models"
)

type busRepository struct {
	db      *db.Database
	queries *models.Queries
}

func NewBusRepository(database *db.Database) domain.Repository {
	return &busRepository{
		db:      database,
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
		return nil, err
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
		return nil, err
	}
	return r.basicToDomain(&row), nil
}

func (r *busRepository) GetByID(ctx context.Context, id int32) (*domain.Bus, error) {
	row, err := r.queries.GetBusByID(ctx, id)
	if err != nil {
		return nil, domain.ErrBusNotFound
	}
	return r.joinedToDomain(&row), nil
}

func (r *busRepository) List(ctx context.Context, limit, offset int32) ([]*domain.Bus, error) {
	rows, err := r.queries.ListBuses(ctx, models.ListBusesParams{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return nil, err
	}

	result := make([]*domain.Bus, len(rows))
	for i, row := range rows {
		result[i] = r.listRowToDomain(&row)
	}
	return result, nil
}

func (r *busRepository) ListByProvider(ctx context.Context, providerID int32, limit, offset int32) ([]*domain.Bus, error) {
	rows, err := r.queries.ListBusesByProvider(ctx, models.ListBusesByProviderParams{
		ProviderID: providerID,
		Limit:      limit,
		Offset:     offset,
	})
	if err != nil {
		return nil, err
	}

	result := make([]*domain.Bus, len(rows))
	for i, row := range rows {
		result[i] = r.providerRowToDomain(&row)
	}
	return result, nil
}

func (r *busRepository) Count(ctx context.Context) (int64, error) {
	return r.queries.CountBuses(ctx)
}

func (r *busRepository) CountByProvider(ctx context.Context, providerID int32) (int64, error) {
	return r.queries.CountBusesByProvider(ctx, providerID)
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
		return nil, err
	}
	return r.basicToDomain(&row), nil
}

func (r *busRepository) UpdateStatus(ctx context.Context, id int32, status string) (*domain.Bus, error) {
	row, err := r.queries.UpdateBusStatus(ctx, models.UpdateBusStatusParams{
		ID:     id,
		Status: &status,
	})
	if err != nil {
		return nil, err
	}
	return r.basicToDomain(&row), nil
}

func (r *busRepository) Delete(ctx context.Context, id int32) error {
	return r.queries.DeleteBus(ctx, id)
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
