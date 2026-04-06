package usecase

import (
	"context"
	"fmt"

	"backend/internals/bus/domain"
	"golang.org/x/sync/errgroup"
)

type BusUseCase interface {
	Create(ctx context.Context, input *domain.CreateBusInput) (*domain.Bus, error)
	GetByID(ctx context.Context, id int32) (*domain.Bus, error)
	List(ctx context.Context, filter *domain.BusFilter) ([]*domain.Bus, int64, error)
	Update(ctx context.Context, id int32, input *domain.UpdateBusInput) (*domain.Bus, error)
	UpdateStatus(ctx context.Context, id int32, status string) (*domain.Bus, error)
	Delete(ctx context.Context, id int32) error
}

type busUseCase struct {
	repo domain.Repository
}

func NewBusUseCase(repo domain.Repository) BusUseCase {
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
		return nil, fmt.Errorf("busUseCase.Create.Validate: %w", err)
	}

	result, err := uc.repo.Create(ctx, bus)
	if err != nil {
		return nil, fmt.Errorf("busUseCase.Create: %w", err)
	}
	return result, nil
}

func (uc *busUseCase) GetByID(ctx context.Context, id int32) (*domain.Bus, error) {
	result, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("busUseCase.GetByID: %w", err)
	}
	return result, nil
}

func (uc *busUseCase) List(ctx context.Context, filter *domain.BusFilter) ([]*domain.Bus, int64, error) {
	var items []*domain.Bus
	var total int64

	g, gctx := errgroup.WithContext(ctx)
	g.Go(func() error {
		var err error
		if filter.ProviderID > 0 {
			items, err = uc.repo.ListByProvider(gctx, filter)
			if err != nil {
				return fmt.Errorf("busUseCase.List.ListByProvider: %w", err)
			}
			return nil
		}

		items, err = uc.repo.List(gctx, filter)
		if err != nil {
			return fmt.Errorf("busUseCase.List.List: %w", err)
		}
		return nil
	})

	g.Go(func() error {
		var err error
		if filter.ProviderID > 0 {
			total, err = uc.repo.CountByProvider(gctx, filter)
			if err != nil {
				return fmt.Errorf("busUseCase.List.CountByProvider: %w", err)
			}
			return nil
		}

		total, err = uc.repo.Count(gctx, filter)
		if err != nil {
			return fmt.Errorf("busUseCase.List.Count: %w", err)
		}
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func (uc *busUseCase) Update(ctx context.Context, id int32, input *domain.UpdateBusInput) (*domain.Bus, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("busUseCase.Update.GetByID: %w", err)
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

	if err := existing.Validate(); err != nil {
		return nil, fmt.Errorf("busUseCase.Update.Validate: %w", err)
	}

	result, updateErr := uc.repo.Update(ctx, id, existing)
	if updateErr != nil {
		return nil, fmt.Errorf("busUseCase.Update: %w", updateErr)
	}
	return result, nil
}

func (uc *busUseCase) UpdateStatus(ctx context.Context, id int32, status string) (*domain.Bus, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("busUseCase.UpdateStatus.GetByID: %w", err)
	}
	existing.Status = status
	if err := existing.Validate(); err != nil {
		return nil, fmt.Errorf("busUseCase.UpdateStatus.Validate: %w", err)
	}

	result, updateErr := uc.repo.UpdateStatus(ctx, id, status)
	if updateErr != nil {
		return nil, fmt.Errorf("busUseCase.UpdateStatus: %w", updateErr)
	}
	return result, nil
}

func (uc *busUseCase) Delete(ctx context.Context, id int32) error {
	_, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("busUseCase.Delete.GetByID: %w", err)
	}

	if err := uc.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("busUseCase.Delete: %w", err)
	}
	return nil
}
