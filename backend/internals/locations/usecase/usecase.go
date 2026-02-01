package usecase

import (
	"context"
	"strings"

	"backend/internals/locations/controller/dto"
	"backend/internals/locations/domain"
	"backend/pkgs/errors"
	"backend/pkgs/paging"
)

type LocationUseCase struct {
	repo domain.Repository
}

func NewLocationUseCase(repo domain.Repository) *LocationUseCase {
	return &LocationUseCase{repo: repo}
}

func (uc *LocationUseCase) Create(ctx context.Context, req *dto.CreateLocationRequest) (*dto.LocationResponse, error) {
	loc := &domain.Location{
		Name:     req.Name,
		City:     req.City,
		Address:  req.Address,
		Keywords: req.Keywords,
	}

	// Use domain validation - returns error codes
	if errs := loc.Validate(); len(errs) > 0 {
		return nil, errors.ValidationError(strings.Join(errs, ", "))
	}

	created, err := uc.repo.Create(ctx, loc)
	if err != nil {
		return nil, err
	}

	return entityToResponse(created), nil
}

func (uc *LocationUseCase) GetByID(ctx context.Context, id int32) (*dto.LocationResponse, error) {
	loc, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return entityToResponse(loc), nil
}

func (uc *LocationUseCase) Update(ctx context.Context, id int32, req *dto.UpdateLocationRequest) (*dto.LocationResponse, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Apply partial updates
	if req.Name != nil {
		existing.Name = *req.Name
	}
	if req.City != nil {
		existing.City = *req.City
	}
	if req.Address != nil {
		existing.Address = *req.Address
	}
	if req.Keywords != nil {
		existing.Keywords = *req.Keywords
	}

	// Re-validate after update
	if errs := existing.Validate(); len(errs) > 0 {
		return nil, errors.ValidationError(strings.Join(errs, ", "))
	}

	updated, err := uc.repo.Update(ctx, existing)
	if err != nil {
		return nil, err
	}

	return entityToResponse(updated), nil
}

func (uc *LocationUseCase) Delete(ctx context.Context, id int32) error {
	_, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	return uc.repo.Delete(ctx, id)
}

func (uc *LocationUseCase) List(ctx context.Context, pg *paging.Paging) (*paging.Page[dto.LocationResponse], error) {
	locations, total, err := uc.repo.List(ctx, &domain.LocationFilter{
		Limit:  int32(pg.PageSize),
		Offset: int32(pg.Offset()),
	})
	if err != nil {
		return nil, err
	}

	items := make([]dto.LocationResponse, len(locations))
	for i, loc := range locations {
		items[i] = *entityToResponse(loc)
	}

	return paging.Of(items, total, pg.Page), nil
}

func (uc *LocationUseCase) Search(ctx context.Context, query string) ([]dto.LocationResponse, error) {
	if query == "" {
		return nil, errors.ValidationError(domain.ErrLocationNameRequired)
	}

	locations, err := uc.repo.Search(ctx, query)
	if err != nil {
		return nil, err
	}

	result := make([]dto.LocationResponse, len(locations))
	for i, loc := range locations {
		result[i] = *entityToResponse(loc)
	}

	return result, nil
}

func entityToResponse(loc *domain.Location) *dto.LocationResponse {
	return &dto.LocationResponse{
		ID:       loc.ID,
		Name:     loc.Name,
		City:     loc.City,
		Address:  loc.Address,
		Keywords: loc.Keywords,
	}
}
