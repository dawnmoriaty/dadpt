package domain

import (
	"errors"
)

var (
	ErrLocationNotFound     = errors.New("location not found")
	ErrLocationNameRequired = errors.New("location name required")
	ErrLocationNameTooShort = errors.New("location name too short")
	ErrLocationCityRequired = errors.New("location city required")
	ErrLocationCityTooShort = errors.New("location city too short")
)

type Location struct {
	ID       int32
	Name     string
	City     string
	Address  string
	Keywords string
	ImageURL string
}

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

type CreateLocationInput struct {
	Name     string
	City     string
	Address  string
	Keywords string
	ImageURL string
}

type UpdateLocationInput struct {
	Name     *string
	City     *string
	Address  *string
	Keywords *string
	ImageURL *string
}
