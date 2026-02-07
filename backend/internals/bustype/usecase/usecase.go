package usecase

import (
	"context"

	"backend/internals/bustype/domain"
	"backend/pkgs/paging"
)

// IBusTypeUseCase defines the interface for bus type use case
type IBusTypeUseCase interface {
	Create(ctx context.Context, input *domain.CreateBusTypeInput) (*domain.BusType, error)
	GetByID(ctx context.Context, id int32) (*domain.BusType, error)
	List(ctx context.Context, pg *paging.Paging) ([]*domain.BusType, int64, error)
	Update(ctx context.Context, id int32, input *domain.UpdateBusTypeInput) (*domain.BusType, error)
	Delete(ctx context.Context, id int32) error
}

type busTypeUseCase struct {
	repo domain.Repository
}

func NewBusTypeUseCase(repo domain.Repository) IBusTypeUseCase {
	return &busTypeUseCase{repo: repo}
}

func (uc *busTypeUseCase) Create(ctx context.Context, input *domain.CreateBusTypeInput) (*domain.BusType, error) {
	busType := &domain.BusType{
		Name:       input.Name,
		TotalSeats: input.TotalSeats,
		SeatLayout: input.SeatLayout,
	}

	if err := busType.Validate(); err != nil {
		return nil, err
	}

	return uc.repo.Create(ctx, busType)
}

func (uc *busTypeUseCase) GetByID(ctx context.Context, id int32) (*domain.BusType, error) {
	return uc.repo.GetByID(ctx, id)
}

func (uc *busTypeUseCase) List(ctx context.Context, pg *paging.Paging) ([]*domain.BusType, int64, error) {
	items, err := uc.repo.List(ctx, int32(pg.PageSize), int32(pg.Offset()))
	if err != nil {
		return nil, 0, err
	}

	total, err := uc.repo.Count(ctx)
	if err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func (uc *busTypeUseCase) Update(ctx context.Context, id int32, input *domain.UpdateBusTypeInput) (*domain.BusType, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
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

	return uc.repo.Update(ctx, id, existing)
}

func (uc *busTypeUseCase) Delete(ctx context.Context, id int32) error {
	_, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	return uc.repo.Delete(ctx, id)
}
