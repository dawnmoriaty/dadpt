package domain

import (
	"errors"
)

// Sentinel errors — stable English identifiers for errors.Is() matching.
// User-facing messages are resolved by the i18n translator at the HTTP edge.
var (
	ErrBusNotFound             = errors.New("bus not found")
	ErrBusProviderIDRequired   = errors.New("bus provider required")
	ErrBusBusTypeIDRequired    = errors.New("bus type required")
	ErrBusLicensePlateRequired = errors.New("license plate required")
	ErrBusLicensePlateTooShort = errors.New("license plate too short")
	ErrBusStatusInvalid        = errors.New("invalid bus status")
)

// Bus represents a specific bus vehicle
type Bus struct {
	ID           int32
	ProviderID   int32
	BusTypeID    int32
	LicensePlate string
	Status       string // active, maintenance, retired
	ImageURL     string

	// Joined fields
	BusTypeName  string
	TotalSeats   int32
	ProviderName string
}

// Validate validates the bus entity
func (b *Bus) Validate() error {
	if b.ProviderID <= 0 {
		return ErrBusProviderIDRequired
	}
	if b.BusTypeID <= 0 {
		return ErrBusBusTypeIDRequired
	}
	if b.LicensePlate == "" {
		return ErrBusLicensePlateRequired
	}
	if len(b.LicensePlate) < 5 {
		return ErrBusLicensePlateTooShort
	}
	return nil
}
