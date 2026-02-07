package domain

import (
	"encoding/json"
	"errors"
)

// Sentinel errors
var (
	ErrBusTypeNotFound           = errors.New("Không tìm thấy loại xe")
	ErrBusTypeNameRequired       = errors.New("Tên loại xe là bắt buộc")
	ErrBusTypeNameTooShort       = errors.New("Tên loại xe quá ngắn")
	ErrBusTypeTotalSeatsRequired = errors.New("Số ghế là bắt buộc")
	ErrBusTypeSeatLayoutRequired = errors.New("Sơ đồ ghế là bắt buộc")
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
