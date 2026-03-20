package repository

import (
	"context"
	"errors"
	"fmt"

	"backend/db"
	"backend/internals/location/domain"
	"backend/pkgs/utils"
	"backend/sql/models"

	"github.com/jackc/pgx/v5"
)

type locationRepository struct {
	queries *models.Queries
}

func NewLocationRepository(database *db.Database) domain.Repository {
	return &locationRepository{
		queries: models.New(database.GetPool()),
	}
}

func sqlcToEntity(m models.Location) *domain.Location {
	return &domain.Location{
		ID:       m.ID,
		Name:     m.Name,
		City:     m.City,
		Address:  utils.PtrToString(m.Address),
		Keywords: utils.PtrToString(m.Keywords),
		ImageURL: utils.PtrToString(m.ImageUrl),
	}
}

func (r *locationRepository) Create(ctx context.Context, loc *domain.Location) (*domain.Location, error) {
	result, err := r.queries.CreateLocation(ctx, models.CreateLocationParams{
		Name:     loc.Name,
		City:     loc.City,
		Address:  utils.StringToPtr(loc.Address),
		Keywords: utils.StringToPtr(loc.Keywords),
		ImageUrl: utils.StringToPtr(loc.ImageURL),
	})
	if err != nil {
		return nil, fmt.Errorf("locationRepository.Create: %w", err)
	}
	return sqlcToEntity(result), nil
}

func (r *locationRepository) GetByID(ctx context.Context, id int32) (*domain.Location, error) {
	result, err := r.queries.GetLocationByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrLocationNotFound
		}
		return nil, fmt.Errorf("locationRepository.GetByID: %w", err)
	}
	return sqlcToEntity(result), nil
}

func (r *locationRepository) Update(ctx context.Context, loc *domain.Location) (*domain.Location, error) {
	result, err := r.queries.UpdateLocation(ctx, models.UpdateLocationParams{
		ID:       loc.ID,
		Name:     loc.Name,
		City:     loc.City,
		Address:  utils.StringToPtr(loc.Address),
		Keywords: utils.StringToPtr(loc.Keywords),
		ImageUrl: utils.StringToPtr(loc.ImageURL),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrLocationNotFound
		}
		return nil, fmt.Errorf("locationRepository.Update: %w", err)
	}
	return sqlcToEntity(result), nil
}

func (r *locationRepository) Delete(ctx context.Context, id int32) error {
	err := r.queries.DeleteLocation(ctx, id)
	if err != nil {
		return fmt.Errorf("locationRepository.Delete: %w", err)
	}
	return nil
}

func (r *locationRepository) List(ctx context.Context, filter *domain.LocationFilter) ([]*domain.Location, error) {
	params := models.ListLocationsParams{
		Limit:  filter.Limit,
		Offset: filter.Offset,
	}

	if filter.Query != "" {
		query := filter.Query
		params.Q = &query
	}
	if filter.City != "" {
		city := filter.City
		params.City = &city
	}

	locations, err := r.queries.ListLocations(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("locationRepository.List: %w", err)
	}

	result := make([]*domain.Location, len(locations))
	for i, loc := range locations {
		result[i] = sqlcToEntity(loc)
	}

	return result, nil
}

func (r *locationRepository) Count(ctx context.Context, filter *domain.LocationFilter) (int64, error) {
	params := models.CountLocationsParams{}
	if filter != nil {
		if filter.Query != "" {
			query := filter.Query
			params.Q = &query
		}
		if filter.City != "" {
			city := filter.City
			params.City = &city
		}
	}

	count, err := r.queries.CountLocations(ctx, params)
	if err != nil {
		return 0, fmt.Errorf("locationRepository.Count: %w", err)
	}
	return count, nil
}

func (r *locationRepository) Search(ctx context.Context, query string) ([]*domain.Location, error) {
	locations, err := r.queries.SearchLocations(ctx, &query)
	if err != nil {
		return nil, fmt.Errorf("locationRepository.Search: %w", err)
	}

	result := make([]*domain.Location, len(locations))
	for i, loc := range locations {
		result[i] = sqlcToEntity(loc)
	}

	return result, nil
}
