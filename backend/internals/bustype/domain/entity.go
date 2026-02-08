package domain

import (
	"encoding/json"
	"errors"
)

// Sentinel errors — stable English identifiers for errors.Is() matching.
// User-facing messages are resolved by the i18n translator at the HTTP edge.
var (
	ErrBusTypeNotFound           = errors.New("bus type not found")
	ErrBusTypeNameRequired       = errors.New("bus type name required")
	ErrBusTypeNameTooShort       = errors.New("bus type name too short")
	ErrBusTypeTotalSeatsRequired = errors.New("total seats required")
	ErrBusTypeSeatLayoutRequired = errors.New("seat layout required")
)

// BusType represents a type of bus with seat layout configuration
type BusType struct {
	ID         int32
	Name       string
	TotalSeats int32
	SeatLayout json.RawMessage
}

// Validate validates the bus type entity
func (bt *BusType) Validate() error {
	if bt.Name == "" {
		return ErrBusTypeNameRequired
	}
	if len(bt.Name) < 2 {
		return ErrBusTypeNameTooShort
	}
	if bt.TotalSeats <= 0 {
		return ErrBusTypeTotalSeatsRequired
	}
	if len(bt.SeatLayout) == 0 {
		return ErrBusTypeSeatLayoutRequired
	}
	return nil
}

// CreateBusTypeInput is the input for creating a new bus type
type CreateBusTypeInput struct {
	Name       string
	TotalSeats int32
	SeatLayout json.RawMessage
}

// UpdateBusTypeInput is the input for updating a bus type (partial update)
type UpdateBusTypeInput struct {
	Name       *string
	TotalSeats *int32
	SeatLayout json.RawMessage
}
