package usecase

import (
	"context"
	"fmt"

	"backend/internals/bustype/domain"
	"golang.org/x/sync/errgroup"
)

// BusTypeUseCase defines bus type use case contract
type BusTypeUseCase interface {
	Create(ctx context.Context, input *domain.CreateBusTypeInput) (*domain.BusType, error)
	GetByID(ctx context.Context, id int32) (*domain.BusType, error)
	List(ctx context.Context, filter *domain.BusTypeFilter) ([]*domain.BusType, int64, error)
	ListAll(ctx context.Context) ([]*domain.BusType, error)
	Update(ctx context.Context, id int32, input *domain.UpdateBusTypeInput) (*domain.BusType, error)
	Delete(ctx context.Context, id int32) error
}

type busTypeUseCase struct {
	repo domain.Repository
}

func NewBusTypeUseCase(repo domain.Repository) BusTypeUseCase {
	return &busTypeUseCase{repo: repo}
}

func (uc *busTypeUseCase) Create(ctx context.Context, input *domain.CreateBusTypeInput) (*domain.BusType, error) {
	busType := &domain.BusType{
		Name:       input.Name,
		TotalSeats: input.TotalSeats,
		SeatLayout: input.SeatLayout,
	}

	if err := busType.Validate(); err != nil {
		return nil, fmt.Errorf("busTypeUseCase.Create.Validate: %w", err)
	}

	result, err := uc.repo.Create(ctx, busType)
	if err != nil {
		return nil, fmt.Errorf("busTypeUseCase.Create: %w", err)
	}
	return result, nil
}

func (uc *busTypeUseCase) GetByID(ctx context.Context, id int32) (*domain.BusType, error) {
	result, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("busTypeUseCase.GetByID: %w", err)
	}
	return result, nil
}

func (uc *busTypeUseCase) List(ctx context.Context, filter *domain.BusTypeFilter) ([]*domain.BusType, int64, error) {
	var (
		items []*domain.BusType
		total int64
	)

	g, gctx := errgroup.WithContext(ctx)
	g.Go(func() error {
		result, err := uc.repo.List(gctx, filter)
		if err != nil {
			return fmt.Errorf("busTypeUseCase.List.List: %w", err)
		}
		items = result
		return nil
	})
	g.Go(func() error {
		count, err := uc.repo.Count(gctx, filter)
		if err != nil {
			return fmt.Errorf("busTypeUseCase.List.Count: %w", err)
		}
		total = count
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func (uc *busTypeUseCase) Update(ctx context.Context, id int32, input *domain.UpdateBusTypeInput) (*domain.BusType, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("busTypeUseCase.Update.GetByID: %w", err)
	}

	if input.Name != nil {
		existing.Name = *input.Name
	}
	if input.TotalSeats != nil {
		existing.TotalSeats = *input.TotalSeats
	}
	if input.SeatLayout != nil {
		existing.SeatLayout = input.SeatLayout
	}

	if err := existing.Validate(); err != nil {
		return nil, fmt.Errorf("busTypeUseCase.Update.Validate: %w", err)
	}

	result, updateErr := uc.repo.Update(ctx, id, existing)
	if updateErr != nil {
		return nil, fmt.Errorf("busTypeUseCase.Update: %w", updateErr)
	}
	return result, nil
}

func (uc *busTypeUseCase) Delete(ctx context.Context, id int32) error {
	_, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("busTypeUseCase.Delete.GetByID: %w", err)
	}

	if err := uc.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("busTypeUseCase.Delete: %w", err)
	}
	return nil
}

func (uc *busTypeUseCase) ListAll(ctx context.Context) ([]*domain.BusType, error) {
	result, err := uc.repo.ListAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("busTypeUseCase.ListAll: %w", err)
	}
	return result, nil
}
