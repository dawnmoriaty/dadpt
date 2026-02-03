package usecase

import (
	"context"

	"backend/internals/bustype/controller/dto"
	"backend/internals/bustype/domain"
	"backend/internals/bustype/repository"
	"backend/pkgs/errors"
	"backend/pkgs/paging"
)

type BusTypeUseCase struct {
	repo *repository.BusTypeRepository
}

func NewBusTypeUseCase(repo *repository.BusTypeRepository) *BusTypeUseCase {
	return &BusTypeUseCase{repo: repo}
}

func (uc *BusTypeUseCase) Create(ctx context.Context, req *dto.CreateBusTypeRequest) (*dto.BusTypeResponse, error) {
	busType := &domain.BusType{
		Name:       req.Name,
		TotalSeats: req.TotalSeats,
		SeatLayout: req.SeatLayout,
	}

	if errs := busType.Validate(); len(errs) > 0 {
		return nil, errors.ValidationError(errs[0])
	}

	result, err := uc.repo.Create(ctx, busType)
	if err != nil {
		return nil, errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to create bus type")
	}

	return dto.ToBusTypeResponse(result), nil
}

func (uc *BusTypeUseCase) GetByID(ctx context.Context, id int32) (*dto.BusTypeResponse, error) {
	result, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.NewAppError(404, errors.ErrCodeNotFound, "Bus type not found")
	}
	return dto.ToBusTypeResponse(result), nil
}

func (uc *BusTypeUseCase) List(ctx context.Context, pg *paging.Paging) (*paging.Page[dto.BusTypeResponse], error) {
	items, err := uc.repo.List(ctx, int32(pg.PageSize), int32(pg.Offset()))
	if err != nil {
		return nil, errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to list bus types")
	}

	total, err := uc.repo.Count(ctx)
	if err != nil {
		return nil, errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to count bus types")
	}

	responses := make([]dto.BusTypeResponse, len(items))
	for i, item := range items {
		responses[i] = *dto.ToBusTypeResponse(item)
	}

	return paging.Of(responses, total, pg.Page), nil
}

func (uc *BusTypeUseCase) Update(ctx context.Context, id int32, req *dto.UpdateBusTypeRequest) (*dto.BusTypeResponse, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.NewAppError(404, errors.ErrCodeNotFound, "Bus type not found")
	}

	if req.Name != nil {
		existing.Name = *req.Name
	}
	if req.TotalSeats != nil {
		existing.TotalSeats = *req.TotalSeats
	}
	if req.SeatLayout != nil {
		existing.SeatLayout = req.SeatLayout
	}

	result, err := uc.repo.Update(ctx, id, existing)
	if err != nil {
		return nil, errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to update bus type")
	}

	return dto.ToBusTypeResponse(result), nil
}

func (uc *BusTypeUseCase) Delete(ctx context.Context, id int32) error {
	_, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return errors.NewAppError(404, errors.ErrCodeNotFound, "Bus type not found")
	}

	if err := uc.repo.Delete(ctx, id); err != nil {
		return errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to delete bus type")
	}

	return nil
}
