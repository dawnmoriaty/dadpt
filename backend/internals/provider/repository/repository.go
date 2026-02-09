package repository

import (
	"context"
	"fmt"

	"backend/db"
	"backend/internals/provider/domain"
	"backend/pkgs/utils"
	"backend/sql/models"
)

type providerRepository struct {
	db      *db.Database
	queries *models.Queries
}

func NewProviderRepository(database *db.Database) domain.Repository {
	return &providerRepository{
		db:      database,
		queries: models.New(database.GetPool()),
	}
}

// Mappers

func sqlcToEntity(m models.Provider) *domain.Provider {
	return &domain.Provider{
		ID:           m.ID,
		Name:         m.Name,
		Hotline:      utils.PtrToString(m.Hotline),
		Slug:         utils.PtrToString(m.Slug),
		PolicyRefund: utils.PtrToString(m.PolicyRefund),
		IsActive:     utils.PtrToBool(m.IsActive),
	}
}

func (r *providerRepository) Create(ctx context.Context, p *domain.Provider) (*domain.Provider, error) {
	result, err := r.queries.CreateProvider(ctx, models.CreateProviderParams{
		Name:         p.Name,
		Hotline:      utils.StringToPtr(p.Hotline),
		Slug:         utils.StringToPtr(p.Slug),
		PolicyRefund: utils.StringToPtr(p.PolicyRefund),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create provider: %w", err)
	}
	return sqlcToEntity(result), nil
}

func (r *providerRepository) GetByID(ctx context.Context, id int32) (*domain.Provider, error) {
	result, err := r.queries.GetProviderByID(ctx, id)
	if err != nil {
		return nil, domain.ErrProviderNotFound
	}
	return sqlcToEntity(result), nil
}

func (r *providerRepository) GetBySlug(ctx context.Context, slug string) (*domain.Provider, error) {
	result, err := r.queries.GetProviderBySlug(ctx, &slug)
	if err != nil {
		return nil, domain.ErrProviderNotFound
	}
	return sqlcToEntity(result), nil
}

func (r *providerRepository) Update(ctx context.Context, p *domain.Provider) (*domain.Provider, error) {
	result, err := r.queries.UpdateProvider(ctx, models.UpdateProviderParams{
		ID:           p.ID,
		Name:         p.Name,
		Hotline:      utils.StringToPtr(p.Hotline),
		Slug:         utils.StringToPtr(p.Slug),
		PolicyRefund: utils.StringToPtr(p.PolicyRefund),
	})
	if err != nil {
		return nil, domain.ErrProviderNotFound
	}
	return sqlcToEntity(result), nil
}

func (r *providerRepository) Delete(ctx context.Context, id int32) error {
	err := r.queries.DeleteProvider(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to delete provider: %w", err)
	}
	return nil
}

func (r *providerRepository) List(ctx context.Context, filter *domain.ProviderFilter) ([]*domain.Provider, int64, error) {
	rows, err := r.queries.ListProvidersAdmin(ctx, models.ListProvidersAdminParams{
		Limit:  filter.Limit,
		Offset: filter.Offset,
	})
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list providers: %w", err)
	}

	count, err := r.queries.CountProviders(ctx)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count providers: %w", err)
	}

	result := make([]*domain.Provider, len(rows))
	for i, row := range rows {
		result[i] = sqlcToEntity(row)
	}

	return result, count, nil
}

func (r *providerRepository) ListActive(ctx context.Context) ([]*domain.Provider, error) {
	rows, err := r.queries.ListProviders(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list active providers: %w", err)
	}

	result := make([]*domain.Provider, len(rows))
	for i, row := range rows {
		result[i] = sqlcToEntity(row)
	}

	return result, nil
}

func (r *providerRepository) ToggleActive(ctx context.Context, id int32) (*domain.Provider, error) {
	result, err := r.queries.ToggleProviderActive(ctx, id)
	if err != nil {
		return nil, domain.ErrProviderNotFound
	}
	return sqlcToEntity(result), nil
}
