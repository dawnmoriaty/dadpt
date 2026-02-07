package usecase

import (
	"context"

	"backend/internals/bus/domain"
	"backend/pkgs/paging"
)

// IBusUseCase defines the interface for bus use case
type IBusUseCase interface {
	Create(ctx context.Context, input *domain.CreateBusInput) (*domain.Bus, error)
	GetByID(ctx context.Context, id int32) (*domain.Bus, error)
	List(ctx context.Context, pg *paging.Paging, providerID int32) ([]*domain.Bus, int64, error)
	Update(ctx context.Context, id int32, input *domain.UpdateBusInput) (*domain.Bus, error)
	UpdateStatus(ctx context.Context, id int32, status string) (*domain.Bus, error)
	Delete(ctx context.Context, id int32) error
}

type busUseCase struct {
	repo domain.Repository
}

func NewBusUseCase(repo domain.Repository) IBusUseCase {
	return &busUseCase{repo: repo}
}

func (uc *busUseCase) Create(ctx context.Context, input *domain.CreateBusInput) (*domain.Bus, error) {
	bus := &domain.Bus{
		ProviderID:   input.ProviderID,
		BusTypeID:    input.BusTypeID,
		LicensePlate: input.LicensePlate,
		Status:       "active",
		ImageURL:     input.ImageURL,
	}

	if err := bus.Validate(); err != nil {
		return nil, err
	}

	return uc.repo.Create(ctx, bus)
}

func (uc *busUseCase) GetByID(ctx context.Context, id int32) (*domain.Bus, error) {
	return uc.repo.GetByID(ctx, id)
}

func (uc *busUseCase) List(ctx context.Context, pg *paging.Paging, providerID int32) ([]*domain.Bus, int64, error) {
	var items []*domain.Bus
	var total int64
	var err error

	if providerID > 0 {
		items, err = uc.repo.ListByProvider(ctx, providerID, int32(pg.PageSize), int32(pg.Offset()))
		if err != nil {
			return nil, 0, err
		}
		total, err = uc.repo.CountByProvider(ctx, providerID)
	} else {
		items, err = uc.repo.List(ctx, int32(pg.PageSize), int32(pg.Offset()))
		if err != nil {
			return nil, 0, err
		}
		total, err = uc.repo.Count(ctx)
	}

	if err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func (uc *busUseCase) Update(ctx context.Context, id int32, input *domain.UpdateBusInput) (*domain.Bus, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if input.BusTypeID != nil {
		existing.BusTypeID = *input.BusTypeID
	}
	if input.LicensePlate != nil {
		existing.LicensePlate = *input.LicensePlate
	}
	if input.Status != nil {
		existing.Status = *input.Status
	}
	if input.ImageURL != nil {
		existing.ImageURL = *input.ImageURL
	}

	return uc.repo.Update(ctx, id, existing)
}

func (uc *busUseCase) UpdateStatus(ctx context.Context, id int32, status string) (*domain.Bus, error) {
	_, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return uc.repo.UpdateStatus(ctx, id, status)
}

func (uc *busUseCase) Delete(ctx context.Context, id int32) error {
	_, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	return uc.repo.Delete(ctx, id)
}
