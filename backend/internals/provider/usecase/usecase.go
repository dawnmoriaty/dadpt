package usecase

import (
	"context"

	"backend/internals/provider/domain"
	"backend/pkgs/paging"
)

type IProviderUseCase interface {
	Create(ctx context.Context, input *domain.CreateProviderInput) (*domain.Provider, error)
	GetByID(ctx context.Context, id int32) (*domain.Provider, error)
	Update(ctx context.Context, id int32, input *domain.UpdateProviderInput) (*domain.Provider, error)
	Delete(ctx context.Context, id int32) error
	List(ctx context.Context, pg *paging.Paging) ([]*domain.Provider, int64, error)
	ListActive(ctx context.Context) ([]*domain.Provider, error)
	ToggleActive(ctx context.Context, id int32) (*domain.Provider, error)
}

type providerUseCase struct {
	repo domain.Repository
}

func NewProviderUseCase(repo domain.Repository) IProviderUseCase {
	return &providerUseCase{repo: repo}
}

func (uc *providerUseCase) Create(ctx context.Context, input *domain.CreateProviderInput) (*domain.Provider, error) {
	// Check slug uniqueness if provided
	if input.Slug != "" {
		existing, _ := uc.repo.GetBySlug(ctx, input.Slug)
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
		return nil, err
	}

	return uc.repo.Create(ctx, provider)
}

func (uc *providerUseCase) GetByID(ctx context.Context, id int32) (*domain.Provider, error) {
	return uc.repo.GetByID(ctx, id)
}

func (uc *providerUseCase) Update(ctx context.Context, id int32, input *domain.UpdateProviderInput) (*domain.Provider, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Check slug uniqueness if changing
	if input.Slug != nil && *input.Slug != existing.Slug {
		other, _ := uc.repo.GetBySlug(ctx, *input.Slug)
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
		return nil, err
	}

	return uc.repo.Update(ctx, existing)
}

func (uc *providerUseCase) Delete(ctx context.Context, id int32) error {
	_, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	return uc.repo.Delete(ctx, id)
}

func (uc *providerUseCase) List(ctx context.Context, pg *paging.Paging) ([]*domain.Provider, int64, error) {
	return uc.repo.List(ctx, &domain.ProviderFilter{
		Limit:  int32(pg.PageSize),
		Offset: int32(pg.Offset()),
	})
}

func (uc *providerUseCase) ListActive(ctx context.Context) ([]*domain.Provider, error) {
	return uc.repo.ListActive(ctx)
}

func (uc *providerUseCase) ToggleActive(ctx context.Context, id int32) (*domain.Provider, error) {
	return uc.repo.ToggleActive(ctx, id)
}
