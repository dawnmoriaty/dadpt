package repository

import (
	"context"

	"backend/db"
	"backend/internals/providers/domain"
	"backend/pkgs/errors"
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
		Hotline:      ptrToString(m.Hotline),
		Slug:         ptrToString(m.Slug),
		PolicyRefund: ptrToString(m.PolicyRefund),
		IsActive:     ptrToBool(m.IsActive),
	}
}

func ptrToString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func ptrToBool(b *bool) bool {
	if b == nil {
		return false
	}
	return *b
}

func stringToPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// Repository implementations

func (r *providerRepository) Create(ctx context.Context, p *domain.Provider) (*domain.Provider, error) {
	result, err := r.queries.CreateProvider(ctx, models.CreateProviderParams{
		Name:         p.Name,
		Hotline:      stringToPtr(p.Hotline),
		Slug:         stringToPtr(p.Slug),
		PolicyRefund: stringToPtr(p.PolicyRefund),
	})
	if err != nil {
		return nil, errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to create provider")
	}
	return sqlcToEntity(result), nil
}

func (r *providerRepository) GetByID(ctx context.Context, id int32) (*domain.Provider, error) {
	result, err := r.queries.GetProviderByID(ctx, id)
	if err != nil {
		return nil, errors.ErrProviderNotFound
	}
	return sqlcToEntity(result), nil
}

func (r *providerRepository) GetBySlug(ctx context.Context, slug string) (*domain.Provider, error) {
	result, err := r.queries.GetProviderBySlug(ctx, &slug)
	if err != nil {
		return nil, errors.ErrProviderNotFound
	}
	return sqlcToEntity(result), nil
}

func (r *providerRepository) Update(ctx context.Context, p *domain.Provider) (*domain.Provider, error) {
	result, err := r.queries.UpdateProvider(ctx, models.UpdateProviderParams{
		ID:           p.ID,
		Name:         p.Name, // Name is string, not *string
		Hotline:      stringToPtr(p.Hotline),
		Slug:         stringToPtr(p.Slug),
		PolicyRefund: stringToPtr(p.PolicyRefund),
	})
	if err != nil {
		return nil, errors.ErrProviderNotFound
	}
	return sqlcToEntity(result), nil
}

func (r *providerRepository) Delete(ctx context.Context, id int32) error {
	err := r.queries.DeleteProvider(ctx, id)
	if err != nil {
		return errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to delete provider")
	}
	return nil
}

func (r *providerRepository) List(ctx context.Context, filter *domain.ProviderFilter) ([]*domain.Provider, int64, error) {
	rows, err := r.queries.ListProvidersAdmin(ctx, models.ListProvidersAdminParams{
		Limit:  filter.Limit,
		Offset: filter.Offset,
	})
	if err != nil {
		return nil, 0, errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to list providers")
	}

	count, err := r.queries.CountProviders(ctx)
	if err != nil {
		return nil, 0, errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to count providers")
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
		return nil, errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to list active providers")
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
		return nil, errors.ErrProviderNotFound
	}
	return sqlcToEntity(result), nil
}
