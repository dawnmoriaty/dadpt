package repository

import (
	"context"

	"backend/db"
	"backend/internals/locations/domain"
	"backend/pkgs/errors"
	"backend/sql/models"
)

// locationRepository implements domain.Repository
type locationRepository struct {
	db      *db.Database
	queries *models.Queries
}

func NewLocationRepository(database *db.Database) domain.Repository {
	return &locationRepository{
		db:      database,
		queries: models.New(database.GetPool()),
	}
}

// Mappers - convert between SQLC models and domain entities

func sqlcToEntity(m models.Location) *domain.Location {
	return &domain.Location{
		ID:       m.ID,
		Name:     m.Name,
		City:     m.City,
		Address:  ptrToString(m.Address),
		Keywords: ptrToString(m.Keywords),
	}
}

func ptrToString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func stringToPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// Repository implementations

func (r *locationRepository) Create(ctx context.Context, loc *domain.Location) (*domain.Location, error) {
	result, err := r.queries.CreateLocation(ctx, models.CreateLocationParams{
		Name:     loc.Name,
		City:     loc.City,
		Address:  stringToPtr(loc.Address),
		Keywords: stringToPtr(loc.Keywords),
	})
	if err != nil {
		return nil, errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to create location")
	}
	return sqlcToEntity(result), nil
}

func (r *locationRepository) GetByID(ctx context.Context, id int32) (*domain.Location, error) {
	result, err := r.queries.GetLocationByID(ctx, id)
	if err != nil {
		return nil, errors.ErrLocationNotFound
	}
	return sqlcToEntity(result), nil
}

func (r *locationRepository) Update(ctx context.Context, loc *domain.Location) (*domain.Location, error) {
	result, err := r.queries.UpdateLocation(ctx, models.UpdateLocationParams{
		ID:       loc.ID,
		Name:     loc.Name, // Name is string, not *string
		City:     loc.City, // City is string, not *string
		Address:  stringToPtr(loc.Address),
		Keywords: stringToPtr(loc.Keywords),
	})
	if err != nil {
		return nil, errors.ErrLocationNotFound
	}
	return sqlcToEntity(result), nil
}

func (r *locationRepository) Delete(ctx context.Context, id int32) error {
	err := r.queries.DeleteLocation(ctx, id)
	if err != nil {
		return errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to delete location")
	}
	return nil
}

func (r *locationRepository) List(ctx context.Context, filter *domain.LocationFilter) ([]*domain.Location, int64, error) {
	locations, err := r.queries.ListLocations(ctx, models.ListLocationsParams{
		Limit:  filter.Limit,
		Offset: filter.Offset,
	})
	if err != nil {
		return nil, 0, errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to list locations")
	}

	count, err := r.queries.CountLocations(ctx)
	if err != nil {
		return nil, 0, errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to count locations")
	}

	result := make([]*domain.Location, len(locations))
	for i, loc := range locations {
		result[i] = sqlcToEntity(loc)
	}

	return result, count, nil
}

func (r *locationRepository) Search(ctx context.Context, query string) ([]*domain.Location, error) {
	locations, err := r.queries.SearchLocations(ctx, &query)
	if err != nil {
		return nil, errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to search locations")
	}

	result := make([]*domain.Location, len(locations))
	for i, loc := range locations {
		result[i] = sqlcToEntity(loc)
	}

	return result, nil
}
