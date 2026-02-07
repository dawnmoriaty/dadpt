package usecase

import (
	"context"

	"backend/internals/locations/domain"
	"backend/pkgs/paging"
)

// ILocationUseCase defines the interface for location use case
type ILocationUseCase interface {
	Create(ctx context.Context, input *domain.CreateLocationInput) (*domain.Location, error)
	GetByID(ctx context.Context, id int32) (*domain.Location, error)
	Update(ctx context.Context, id int32, input *domain.UpdateLocationInput) (*domain.Location, error)
	Delete(ctx context.Context, id int32) error
	List(ctx context.Context, pg *paging.Paging) ([]*domain.Location, int64, error)
	Search(ctx context.Context, query string) ([]*domain.Location, error)
}

type locationUseCase struct {
	repo domain.Repository
}

func NewLocationUseCase(repo domain.Repository) ILocationUseCase {
	return &locationUseCase{repo: repo}
}

func (uc *locationUseCase) Create(ctx context.Context, input *domain.CreateLocationInput) (*domain.Location, error) {
	loc := &domain.Location{
		Name:     input.Name,
		City:     input.City,
		Address:  input.Address,
		Keywords: input.Keywords,
	}

	if err := loc.Validate(); err != nil {
		return nil, err
	}

	return uc.repo.Create(ctx, loc)
}

func (uc *locationUseCase) GetByID(ctx context.Context, id int32) (*domain.Location, error) {
	return uc.repo.GetByID(ctx, id)
}

func (uc *locationUseCase) Update(ctx context.Context, id int32, input *domain.UpdateLocationInput) (*domain.Location, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if input.Name != nil {
		existing.Name = *input.Name
	}
	if input.City != nil {
		existing.City = *input.City
	}
	if input.Address != nil {
		existing.Address = *input.Address
	}
	if input.Keywords != nil {
		existing.Keywords = *input.Keywords
	}

	if err := existing.Validate(); err != nil {
		return nil, err
	}

	return uc.repo.Update(ctx, existing)
}

func (uc *locationUseCase) Delete(ctx context.Context, id int32) error {
	_, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	return uc.repo.Delete(ctx, id)
}

func (uc *locationUseCase) List(ctx context.Context, pg *paging.Paging) ([]*domain.Location, int64, error) {
	return uc.repo.List(ctx, &domain.LocationFilter{
		Limit:  int32(pg.PageSize),
		Offset: int32(pg.Offset()),
	})
}

func (uc *locationUseCase) Search(ctx context.Context, query string) ([]*domain.Location, error) {
	if query == "" {
		return nil, domain.ErrLocationNameRequired
	}

	return uc.repo.Search(ctx, query)
}
