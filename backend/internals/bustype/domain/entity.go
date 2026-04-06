package domain

import (
	"encoding/json"
	"errors"
)

var (
	ErrBusTypeNotFound           = errors.New("bus type not found")
	ErrBusTypeNameRequired       = errors.New("bus type name required")
	ErrBusTypeNameTooShort       = errors.New("bus type name too short")
	ErrBusTypeTotalSeatsRequired = errors.New("total seats required")
	ErrBusTypeSeatLayoutRequired = errors.New("seat layout required")
)

type BusType struct {
	ID         int32
	Name       string
	TotalSeats int32
	SeatLayout json.RawMessage
}

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

type CreateBusTypeInput struct {
	Name       string
	TotalSeats int32
	SeatLayout json.RawMessage
}

type UpdateBusTypeInput struct {
	Name       *string
	TotalSeats *int32
	SeatLayout json.RawMessage
}

type BusTypeFilter struct {
	Limit  int32
	Offset int32
	Query  string
}
