package usecase

import (
	"context"
	"errors"
	"fmt"

	"backend/internals/provider/domain"
	"golang.org/x/sync/errgroup"
)

type ProviderUseCase interface {
	Create(ctx context.Context, input *domain.CreateProviderInput) (*domain.Provider, error)
	GetByID(ctx context.Context, id int32) (*domain.Provider, error)
	Update(ctx context.Context, id int32, input *domain.UpdateProviderInput) (*domain.Provider, error)
	Delete(ctx context.Context, id int32) error
	List(ctx context.Context, filter *domain.ProviderFilter) ([]*domain.Provider, int64, error)
	ListActive(ctx context.Context) ([]*domain.Provider, error)
	ToggleActive(ctx context.Context, id int32) (*domain.Provider, error)
}

type providerUseCase struct {
	repo domain.Repository
}

func NewProviderUseCase(repo domain.Repository) ProviderUseCase {
	return &providerUseCase{repo: repo}
}

func (uc *providerUseCase) Create(ctx context.Context, input *domain.CreateProviderInput) (*domain.Provider, error) {
	// Check slug uniqueness if provided
	if input.Slug != "" {
		existing, err := uc.repo.GetBySlug(ctx, input.Slug)
		if err != nil && !errors.Is(err, domain.ErrProviderNotFound) {
			return nil, fmt.Errorf("providerUseCase.Create.GetBySlug: %w", err)
		}
		if existing != nil {
			return nil, domain.ErrDuplicateSlug
		}
	}

	provider := &domain.Provider{
		Name:         input.Name,
		Hotline:      input.Hotline,
		Slug:         input.Slug,
		PolicyRefund: input.PolicyRefund,
		IsActive:     true,
	}

	if err := provider.Validate(); err != nil {
		return nil, fmt.Errorf("providerUseCase.Create.Validate: %w", err)
	}

	result, err := uc.repo.Create(ctx, provider)
	if err != nil {
		return nil, fmt.Errorf("providerUseCase.Create: %w", err)
	}
	return result, nil
}

func (uc *providerUseCase) GetByID(ctx context.Context, id int32) (*domain.Provider, error) {
	result, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("providerUseCase.GetByID: %w", err)
	}
	return result, nil
}

func (uc *providerUseCase) Update(ctx context.Context, id int32, input *domain.UpdateProviderInput) (*domain.Provider, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("providerUseCase.Update.GetByID: %w", err)
	}

	// Check slug uniqueness if changing
	if input.Slug != nil && *input.Slug != existing.Slug {
		other, slugErr := uc.repo.GetBySlug(ctx, *input.Slug)
		if slugErr != nil && !errors.Is(slugErr, domain.ErrProviderNotFound) {
			return nil, fmt.Errorf("providerUseCase.Update.GetBySlug: %w", slugErr)
		}
		if other != nil && other.ID != id {
			return nil, domain.ErrDuplicateSlug
		}
	}

	if input.Name != nil {
		existing.Name = *input.Name
	}
	if input.Hotline != nil {
		existing.Hotline = *input.Hotline
	}
	if input.Slug != nil {
		existing.Slug = *input.Slug
	}
	if input.PolicyRefund != nil {
		existing.PolicyRefund = *input.PolicyRefund
	}

	if err := existing.Validate(); err != nil {
		return nil, fmt.Errorf("providerUseCase.Update.Validate: %w", err)
	}

	result, updateErr := uc.repo.Update(ctx, existing)
	if updateErr != nil {
		return nil, fmt.Errorf("providerUseCase.Update: %w", updateErr)
	}
	return result, nil
}

func (uc *providerUseCase) Delete(ctx context.Context, id int32) error {
	_, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("providerUseCase.Delete.GetByID: %w", err)
	}
	if err := uc.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("providerUseCase.Delete: %w", err)
	}
	return nil
}

func (uc *providerUseCase) List(ctx context.Context, filter *domain.ProviderFilter) ([]*domain.Provider, int64, error) {
	var (
		items []*domain.Provider
		total int64
	)

	g, gctx := errgroup.WithContext(ctx)
	g.Go(func() error {
		result, err := uc.repo.List(gctx, filter)
		if err != nil {
			return fmt.Errorf("providerUseCase.List.List: %w", err)
		}
		items = result
		return nil
	})
	g.Go(func() error {
		count, err := uc.repo.Count(gctx, filter)
		if err != nil {
			return fmt.Errorf("providerUseCase.List.Count: %w", err)
		}
		total = count
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func (uc *providerUseCase) ListActive(ctx context.Context) ([]*domain.Provider, error) {
	result, err := uc.repo.ListActive(ctx)
	if err != nil {
		return nil, fmt.Errorf("providerUseCase.ListActive: %w", err)
	}
	return result, nil
}

func (uc *providerUseCase) ToggleActive(ctx context.Context, id int32) (*domain.Provider, error) {
	result, err := uc.repo.ToggleActive(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("providerUseCase.ToggleActive: %w", err)
	}
	return result, nil
}
