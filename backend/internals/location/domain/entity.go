package domain

import (
	"errors"
)

// Sentinel errors — stable English identifiers for errors.Is() matching.
// User-facing messages are resolved by the i18n translator at the HTTP edge.
var (
	ErrLocationNotFound     = errors.New("location not found")
	ErrLocationNameRequired = errors.New("location name required")
	ErrLocationNameTooShort = errors.New("location name too short")
	ErrLocationCityRequired = errors.New("location city required")
	ErrLocationCityTooShort = errors.New("location city too short")
)

// Location is a pure domain entity representing a bus terminal/station
type Location struct {
	ID       int32
	Name     string
	City     string
	Address  string
	Keywords string
	ImageURL string
}

// LocationFilter for listing/searching locations
type LocationFilter struct {
	Limit  int32
	Offset int32
	Query  string
	City   string
}

const (
	DefaultSearchLimit int32 = 50
	MaxSearchLimit     int32 = 200
)

// Validate validates the location entity
func (l *Location) Validate() error {
	if l.Name == "" {
		return ErrLocationNameRequired
	}
	if len(l.Name) < 2 {
		return ErrLocationNameTooShort
	}
	if l.City == "" {
		return ErrLocationCityRequired
	}
	if len(l.City) < 2 {
		return ErrLocationCityTooShort
	}
	return nil
}

// CreateLocationInput is the input for creating a new location
type CreateLocationInput struct {
	Name     string
	City     string
	Address  string
	Keywords string
	ImageURL string
}

// UpdateLocationInput is the input for updating a location (partial update)
type UpdateLocationInput struct {
	Name     *string
	City     *string
	Address  *string
	Keywords *string
	ImageURL *string
}
