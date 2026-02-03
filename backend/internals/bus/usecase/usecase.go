package usecase

import (
	"context"

	"backend/internals/bus/controller/dto"
	"backend/internals/bus/domain"
	"backend/internals/bus/repository"
	"backend/pkgs/errors"
	"backend/pkgs/paging"
)

type BusUseCase struct {
	repo *repository.BusRepository
}

func NewBusUseCase(repo *repository.BusRepository) *BusUseCase {
	return &BusUseCase{repo: repo}
}

func (uc *BusUseCase) Create(ctx context.Context, req *dto.CreateBusRequest) (*dto.BusResponse, error) {
	bus := &domain.Bus{
		ProviderID:   req.ProviderID,
		BusTypeID:    req.BusTypeID,
		LicensePlate: req.LicensePlate,
		Status:       "active",
		ImageURL:     req.ImageURL,
	}

	if errs := bus.Validate(); len(errs) > 0 {
		return nil, errors.ValidationError(errs[0])
	}

	result, err := uc.repo.Create(ctx, bus)
	if err != nil {
		return nil, errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to create bus")
	}

	return dto.ToBusResponse(result), nil
}

func (uc *BusUseCase) GetByID(ctx context.Context, id int32) (*dto.BusResponse, error) {
	result, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.NewAppError(404, errors.ErrCodeNotFound, "Bus not found")
	}
	return dto.ToBusResponse(result), nil
}

func (uc *BusUseCase) List(ctx context.Context, pg *paging.Paging, providerID int32) (*paging.Page[dto.BusResponse], error) {
	var items []*domain.Bus
	var total int64
	var err error

	if providerID > 0 {
		items, err = uc.repo.ListByProvider(ctx, providerID, int32(pg.PageSize), int32(pg.Offset()))
		if err != nil {
			return nil, errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to list buses")
		}
		total, err = uc.repo.CountByProvider(ctx, providerID)
	} else {
		items, err = uc.repo.List(ctx, int32(pg.PageSize), int32(pg.Offset()))
		if err != nil {
			return nil, errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to list buses")
		}
		total, err = uc.repo.Count(ctx)
	}

	if err != nil {
		return nil, errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to count buses")
	}

	responses := make([]dto.BusResponse, len(items))
	for i, item := range items {
		responses[i] = *dto.ToBusResponse(item)
	}

	return paging.Of(responses, total, pg.Page), nil
}

func (uc *BusUseCase) Update(ctx context.Context, id int32, req *dto.UpdateBusRequest) (*dto.BusResponse, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.NewAppError(404, errors.ErrCodeNotFound, "Bus not found")
	}

	if req.BusTypeID != nil {
		existing.BusTypeID = *req.BusTypeID
	}
	if req.LicensePlate != nil {
		existing.LicensePlate = *req.LicensePlate
	}
	if req.Status != nil {
		existing.Status = *req.Status
	}
	if req.ImageURL != nil {
		existing.ImageURL = *req.ImageURL
	}

	result, err := uc.repo.Update(ctx, id, existing)
	if err != nil {
		return nil, errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to update bus")
	}

	return dto.ToBusResponse(result), nil
}

func (uc *BusUseCase) UpdateStatus(ctx context.Context, id int32, status string) (*dto.BusResponse, error) {
	_, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.NewAppError(404, errors.ErrCodeNotFound, "Bus not found")
	}

	result, err := uc.repo.UpdateStatus(ctx, id, status)
	if err != nil {
		return nil, errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to update bus status")
	}

	return dto.ToBusResponse(result), nil
}

func (uc *BusUseCase) Delete(ctx context.Context, id int32) error {
	_, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return errors.NewAppError(404, errors.ErrCodeNotFound, "Bus not found")
	}

	if err := uc.repo.Delete(ctx, id); err != nil {
		return errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to delete bus")
	}

	return nil
}
