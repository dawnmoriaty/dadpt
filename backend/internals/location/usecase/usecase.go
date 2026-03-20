package usecase

import (
	"context"
	"fmt"

	"backend/internals/location/domain"
	"golang.org/x/sync/errgroup"
)

type LocationUseCase interface {
	Create(ctx context.Context, input *domain.CreateLocationInput) (*domain.Location, error)
	GetByID(ctx context.Context, id int32) (*domain.Location, error)
	Update(ctx context.Context, id int32, input *domain.UpdateLocationInput) (*domain.Location, error)
	Delete(ctx context.Context, id int32) error
	List(ctx context.Context, filter *domain.LocationFilter) ([]*domain.Location, int64, error)
	Search(ctx context.Context, query string) ([]*domain.Location, error)
}

type locationUseCase struct {
	repo domain.Repository
}

func NewLocationUseCase(repo domain.Repository) LocationUseCase {
	return &locationUseCase{repo: repo}
}

func (uc *locationUseCase) Create(ctx context.Context, input *domain.CreateLocationInput) (*domain.Location, error) {
	loc := &domain.Location{
		Name:     input.Name,
		City:     input.City,
		Address:  input.Address,
		Keywords: input.Keywords,
		ImageURL: input.ImageURL,
	}

	if err := loc.Validate(); err != nil {
		return nil, fmt.Errorf("locationUseCase.Create.Validate: %w", err)
	}

	result, err := uc.repo.Create(ctx, loc)
	if err != nil {
		return nil, fmt.Errorf("locationUseCase.Create: %w", err)
	}
	return result, nil
}

func (uc *locationUseCase) GetByID(ctx context.Context, id int32) (*domain.Location, error) {
	result, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("locationUseCase.GetByID: %w", err)
	}
	return result, nil
}

func (uc *locationUseCase) Update(ctx context.Context, id int32, input *domain.UpdateLocationInput) (*domain.Location, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("locationUseCase.Update.GetByID: %w", err)
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
	if input.ImageURL != nil {
		existing.ImageURL = *input.ImageURL
	}

	if err := existing.Validate(); err != nil {
		return nil, fmt.Errorf("locationUseCase.Update.Validate: %w", err)
	}

	result, err := uc.repo.Update(ctx, existing)
	if err != nil {
		return nil, fmt.Errorf("locationUseCase.Update: %w", err)
	}
	return result, nil
}

func (uc *locationUseCase) Delete(ctx context.Context, id int32) error {
	_, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("locationUseCase.Delete.GetByID: %w", err)
	}
	if err := uc.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("locationUseCase.Delete: %w", err)
	}
	return nil
}

func (uc *locationUseCase) List(ctx context.Context, filter *domain.LocationFilter) ([]*domain.Location, int64, error) {
	var (
		items []*domain.Location
		total int64
	)

	g, gctx := errgroup.WithContext(ctx)
	g.Go(func() error {
		result, err := uc.repo.List(gctx, filter)
		if err != nil {
			return fmt.Errorf("locationUseCase.List.List: %w", err)
		}
		items = result
		return nil
	})
	g.Go(func() error {
		count, err := uc.repo.Count(gctx, filter)
		if err != nil {
			return fmt.Errorf("locationUseCase.List.Count: %w", err)
		}
		total = count
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func (uc *locationUseCase) Search(ctx context.Context, query string) ([]*domain.Location, error) {
	if query == "" {
		return nil, domain.ErrLocationNameRequired
	}

	result, err := uc.repo.Search(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("locationUseCase.Search: %w", err)
	}
	return result, nil
}
