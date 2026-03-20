package repository

import (
	"context"
	"errors"
	"fmt"

	"backend/db"
	"backend/internals/provider/domain"
	"backend/pkgs/utils"
	"backend/sql/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type providerRepository struct {
	queries *models.Queries
}

func NewProviderRepository(database *db.Database) domain.Repository {
	return &providerRepository{
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
		if isUniqueViolation(err) {
			return nil, domain.ErrDuplicateSlug
		}
		return nil, fmt.Errorf("providerRepository.Create: %w", err)
	}
	return sqlcToEntity(result), nil
}

func (r *providerRepository) GetByID(ctx context.Context, id int32) (*domain.Provider, error) {
	result, err := r.queries.GetProviderByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrProviderNotFound
		}
		return nil, fmt.Errorf("providerRepository.GetByID: %w", err)
	}
	return sqlcToEntity(result), nil
}

func (r *providerRepository) GetBySlug(ctx context.Context, slug string) (*domain.Provider, error) {
	result, err := r.queries.GetProviderBySlug(ctx, &slug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrProviderNotFound
		}
		return nil, fmt.Errorf("providerRepository.GetBySlug: %w", err)
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
		if isUniqueViolation(err) {
			return nil, domain.ErrDuplicateSlug
		}
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrProviderNotFound
		}
		return nil, fmt.Errorf("providerRepository.Update: %w", err)
	}
	return sqlcToEntity(result), nil
}

func (r *providerRepository) Delete(ctx context.Context, id int32) error {
	err := r.queries.DeleteProvider(ctx, id)
	if err != nil {
		return fmt.Errorf("providerRepository.Delete: %w", err)
	}
	return nil
}

func (r *providerRepository) List(ctx context.Context, filter *domain.ProviderFilter) ([]*domain.Provider, error) {
	params := models.ListProvidersAdminParams{
		Limit:  filter.Limit,
		Offset: filter.Offset,
	}
	if filter.Query != "" {
		q := filter.Query
		params.Q = &q
	}
	params.IsActive = filter.IsActive

	rows, err := r.queries.ListProvidersAdmin(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("providerRepository.List: %w", err)
	}

	result := make([]*domain.Provider, len(rows))
	for i, row := range rows {
		result[i] = sqlcToEntity(row)
	}

	return result, nil
}

func (r *providerRepository) Count(ctx context.Context, filter *domain.ProviderFilter) (int64, error) {
	params := models.CountProvidersParams{}
	if filter != nil {
		if filter.Query != "" {
			q := filter.Query
			params.Q = &q
		}
		params.IsActive = filter.IsActive
	}

	count, err := r.queries.CountProviders(ctx, params)
	if err != nil {
		return 0, fmt.Errorf("providerRepository.Count: %w", err)
	}
	return count, nil
}

func (r *providerRepository) ListActive(ctx context.Context) ([]*domain.Provider, error) {
	rows, err := r.queries.ListProviders(ctx)
	if err != nil {
		return nil, fmt.Errorf("providerRepository.ListActive: %w", err)
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
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrProviderNotFound
		}
		return nil, fmt.Errorf("providerRepository.ToggleActive: %w", err)
	}
	return sqlcToEntity(result), nil
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
