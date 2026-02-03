package domain

import "encoding/json"

// BusType represents a type of bus with seat layout configuration
type BusType struct {
	ID         int32
	Name       string
	TotalSeats int32
	SeatLayout json.RawMessage
}

// BusTypeFilter for listing/searching bus types
type BusTypeFilter struct {
	Limit  int32
	Offset int32
}

// Validation error constants
var (
	ErrBusTypeNameRequired       = "BUS_TYPE_NAME_REQUIRED"
	ErrBusTypeNameTooShort       = "BUS_TYPE_NAME_TOO_SHORT"
	ErrBusTypeTotalSeatsRequired = "BUS_TYPE_TOTAL_SEATS_REQUIRED"
	ErrBusTypeSeatLayoutRequired = "BUS_TYPE_SEAT_LAYOUT_REQUIRED"
)

// Validate validates the bus type
func (bt *BusType) Validate() []string {
	var errs []string

	if bt.Name == "" {
		errs = append(errs, ErrBusTypeNameRequired)
	} else if len(bt.Name) < 2 {
		errs = append(errs, ErrBusTypeNameTooShort)
	}

	if bt.TotalSeats <= 0 {
		errs = append(errs, ErrBusTypeTotalSeatsRequired)
	}

	if len(bt.SeatLayout) == 0 {
		errs = append(errs, ErrBusTypeSeatLayoutRequired)
	}

	return errs
}
