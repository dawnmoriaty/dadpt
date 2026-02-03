package repository

import (
	"context"

	"backend/db"
	"backend/internals/bus/domain"
	"backend/sql/models"
)

type BusRepository struct {
	db      *db.Database
	queries *models.Queries
}

func NewBusRepository(database *db.Database) *BusRepository {
	return &BusRepository{
		db:      database,
		queries: models.New(database.GetPool()),
	}
}

func (r *BusRepository) Create(ctx context.Context, bus *domain.Bus) (*domain.Bus, error) {
	status := bus.Status
	if status == "" {
		status = "active"
	}
	var imageURL *string
	if bus.ImageURL != "" {
		imageURL = &bus.ImageURL
	}

	row, err := r.queries.CreateBus(ctx, models.CreateBusParams{
		ProviderID:   bus.ProviderID,
		BusTypeID:    bus.BusTypeID,
		LicensePlate: bus.LicensePlate,
		Status:       &status,
		ImageUrl:     imageURL,
	})
	if err != nil {
		return nil, err
	}
	return r.basicToDomain(&row), nil
}

func (r *BusRepository) GetByID(ctx context.Context, id int32) (*domain.Bus, error) {
	row, err := r.queries.GetBusByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return r.joinedToDomain(&row), nil
}

func (r *BusRepository) List(ctx context.Context, limit, offset int32) ([]*domain.Bus, error) {
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

func (r *BusRepository) ListByProvider(ctx context.Context, providerID int32, limit, offset int32) ([]*domain.Bus, error) {
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

func (r *BusRepository) Count(ctx context.Context) (int64, error) {
	return r.queries.CountBuses(ctx)
}

func (r *BusRepository) CountByProvider(ctx context.Context, providerID int32) (int64, error) {
	return r.queries.CountBusesByProvider(ctx, providerID)
}

func (r *BusRepository) Update(ctx context.Context, id int32, bus *domain.Bus) (*domain.Bus, error) {
	var imageURL *string
	if bus.ImageURL != "" {
		imageURL = &bus.ImageURL
	}

	row, err := r.queries.UpdateBus(ctx, models.UpdateBusParams{
		ID:           id,
		BusTypeID:    bus.BusTypeID,
		LicensePlate: bus.LicensePlate,
		Status:       &bus.Status,
		ImageUrl:     imageURL,
	})
	if err != nil {
		return nil, err
	}
	return r.basicToDomain(&row), nil
}

func (r *BusRepository) UpdateStatus(ctx context.Context, id int32, status string) (*domain.Bus, error) {
	row, err := r.queries.UpdateBusStatus(ctx, models.UpdateBusStatusParams{
		ID:     id,
		Status: &status,
	})
	if err != nil {
		return nil, err
	}
	return r.basicToDomain(&row), nil
}

func (r *BusRepository) Delete(ctx context.Context, id int32) error {
	return r.queries.DeleteBus(ctx, id)
}

func (r *BusRepository) basicToDomain(m *models.Bus) *domain.Bus {
	status := ""
	if m.Status != nil {
		status = *m.Status
	}
	imageURL := ""
	if m.ImageUrl != nil {
		imageURL = *m.ImageUrl
	}
	return &domain.Bus{
		ID:           m.ID,
		ProviderID:   m.ProviderID,
		BusTypeID:    m.BusTypeID,
		LicensePlate: m.LicensePlate,
		Status:       status,
		ImageURL:     imageURL,
	}
}

func (r *BusRepository) joinedToDomain(m *models.GetBusByIDRow) *domain.Bus {
	status := ""
	if m.Status != nil {
		status = *m.Status
	}
	imageURL := ""
	if m.ImageUrl != nil {
		imageURL = *m.ImageUrl
	}
	return &domain.Bus{
		ID:           m.ID,
		ProviderID:   m.ProviderID,
		BusTypeID:    m.BusTypeID,
		LicensePlate: m.LicensePlate,
		Status:       status,
		ImageURL:     imageURL,
		BusTypeName:  m.BusTypeName,
		TotalSeats:   m.TotalSeats,
		ProviderName: m.ProviderName,
	}
}

func (r *BusRepository) listRowToDomain(m *models.ListBusesRow) *domain.Bus {
	status := ""
	if m.Status != nil {
		status = *m.Status
	}
	imageURL := ""
	if m.ImageUrl != nil {
		imageURL = *m.ImageUrl
	}
	return &domain.Bus{
		ID:           m.ID,
		ProviderID:   m.ProviderID,
		BusTypeID:    m.BusTypeID,
		LicensePlate: m.LicensePlate,
		Status:       status,
		ImageURL:     imageURL,
		BusTypeName:  m.BusTypeName,
		TotalSeats:   m.TotalSeats,
		ProviderName: m.ProviderName,
	}
}

func (r *BusRepository) providerRowToDomain(m *models.ListBusesByProviderRow) *domain.Bus {
	status := ""
	if m.Status != nil {
		status = *m.Status
	}
	imageURL := ""
	if m.ImageUrl != nil {
		imageURL = *m.ImageUrl
	}
	return &domain.Bus{
		ID:           m.ID,
		ProviderID:   m.ProviderID,
		BusTypeID:    m.BusTypeID,
		LicensePlate: m.LicensePlate,
		Status:       status,
		ImageURL:     imageURL,
		BusTypeName:  m.BusTypeName,
		TotalSeats:   m.TotalSeats,
		ProviderName: m.ProviderName,
	}
}
