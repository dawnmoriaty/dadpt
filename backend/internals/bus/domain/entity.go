package domain

import (
	"errors"
)

var (
	ErrBusNotFound                  = errors.New("bus not found")
	ErrBusProviderIDRequired        = errors.New("bus provider required")
	ErrBusBusTypeIDRequired         = errors.New("bus type required")
	ErrBusLicensePlateRequired      = errors.New("license plate required")
	ErrBusLicensePlateTooShort      = errors.New("license plate too short")
	ErrBusStatusInvalid             = errors.New("invalid bus status")
	ErrBusLicensePlateAlreadyExists = errors.New("license plate already exists")
)

type Bus struct {
	ID           int32
	ProviderID   int32
	BusTypeID    int32
	LicensePlate string
	Status       string // active, maintenance, retired
	ImageURL     string

	BusTypeName  string
	TotalSeats   int32
	ProviderName string
}

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
	if b.Status != "" && b.Status != "active" && b.Status != "maintenance" && b.Status != "retired" {
		return ErrBusStatusInvalid
	}
	return nil
}
