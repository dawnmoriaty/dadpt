package usecase

import (
	"context"

	"backend/internals/providers/controller/dto"
	"backend/internals/providers/domain"
	"backend/pkgs/errors"
	"backend/pkgs/paging"
)

type ProviderUseCase struct {
	repo domain.Repository
}

func NewProviderUseCase(repo domain.Repository) *ProviderUseCase {
	return &ProviderUseCase{repo: repo}
}

func (uc *ProviderUseCase) Create(ctx context.Context, req *dto.CreateProviderRequest) (*dto.ProviderResponse, error) {
	if req.Name == "" {
		return nil, errors.RequiredField("name")
	}

	// Check slug uniqueness if provided
	if req.Slug != "" {
		existing, _ := uc.repo.GetBySlug(ctx, req.Slug)
		if existing != nil {
			return nil, errors.ErrDuplicateSlug
		}
	}

	provider := &domain.Provider{
		Name:         req.Name,
		Hotline:      req.Hotline,
		Slug:         req.Slug,
		PolicyRefund: req.PolicyRefund,
		IsActive:     true,
	}

	created, err := uc.repo.Create(ctx, provider)
	if err != nil {
		return nil, err
	}

	return entityToResponse(created), nil
}

func (uc *ProviderUseCase) GetByID(ctx context.Context, id int32) (*dto.ProviderResponse, error) {
	provider, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return entityToResponse(provider), nil
}

func (uc *ProviderUseCase) Update(ctx context.Context, id int32, req *dto.UpdateProviderRequest) (*dto.ProviderResponse, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Check slug uniqueness if changing
	if req.Slug != nil && *req.Slug != existing.Slug {
		other, _ := uc.repo.GetBySlug(ctx, *req.Slug)
		if other != nil && other.ID != id {
			return nil, errors.ErrDuplicateSlug
		}
	}

	if req.Name != nil {
		existing.Name = *req.Name
	}
	if req.Hotline != nil {
		existing.Hotline = *req.Hotline
	}
	if req.Slug != nil {
		existing.Slug = *req.Slug
	}
	if req.PolicyRefund != nil {
		existing.PolicyRefund = *req.PolicyRefund
	}

	updated, err := uc.repo.Update(ctx, existing)
	if err != nil {
		return nil, err
	}

	return entityToResponse(updated), nil
}

func (uc *ProviderUseCase) Delete(ctx context.Context, id int32) error {
	_, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	return uc.repo.Delete(ctx, id)
}

func (uc *ProviderUseCase) List(ctx context.Context, pg *paging.Paging) (*paging.Page[dto.ProviderResponse], error) {
	providers, total, err := uc.repo.List(ctx, &domain.ProviderFilter{
		Limit:  int32(pg.PageSize),
		Offset: int32(pg.Offset()),
	})
	if err != nil {
		return nil, err
	}

	items := make([]dto.ProviderResponse, len(providers))
	for i, p := range providers {
		items[i] = *entityToResponse(p)
	}

	return paging.Of(items, total, pg.Page), nil
}

func (uc *ProviderUseCase) ListActive(ctx context.Context) ([]dto.ProviderResponse, error) {
	providers, err := uc.repo.ListActive(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]dto.ProviderResponse, len(providers))
	for i, p := range providers {
		result[i] = *entityToResponse(p)
	}

	return result, nil
}

func (uc *ProviderUseCase) ToggleActive(ctx context.Context, id int32) (*dto.ProviderResponse, error) {
	updated, err := uc.repo.ToggleActive(ctx, id)
	if err != nil {
		return nil, err
	}
	return entityToResponse(updated), nil
}

func entityToResponse(p *domain.Provider) *dto.ProviderResponse {
	return &dto.ProviderResponse{
		ID:           p.ID,
		Name:         p.Name,
		Hotline:      p.Hotline,
		Slug:         p.Slug,
		PolicyRefund: p.PolicyRefund,
		IsActive:     p.IsActive,
	}
}
