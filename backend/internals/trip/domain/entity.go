package domain

import (
	"encoding/json"
	"time"
)

// Domain validation errors - defined as constants for consistency
var (
	ErrTripStatusInvalid          = "TRIP_STATUS_INVALID"
	ErrTripTransitionInvalid      = "TRIP_TRANSITION_INVALID"
	ErrTripDepartureInPast        = "TRIP_DEPARTURE_IN_PAST"
	ErrTripArrivalBeforeDeparture = "TRIP_ARRIVAL_BEFORE_DEPARTURE"
	ErrTripProviderRequired       = "TRIP_PROVIDER_REQUIRED"
	ErrTripOriginRequired         = "TRIP_ORIGIN_REQUIRED"
	ErrTripDestinationRequired    = "TRIP_DESTINATION_REQUIRED"
	ErrTripPriceInvalid           = "TRIP_PRICE_INVALID"
	ErrTripCannotModify           = "TRIP_CANNOT_MODIFY_NON_SCHEDULED"
	ErrTripCannotDelete           = "TRIP_CANNOT_DELETE_NON_SCHEDULED"
)

type TripStatus string

const (
	TripStatusScheduled TripStatus = "scheduled"
	TripStatusDeparted  TripStatus = "departed"
	TripStatusCompleted TripStatus = "completed"
	TripStatusCancelled TripStatus = "cancelled"
)

func (s TripStatus) IsValid() bool {
	switch s {
	case TripStatusScheduled, TripStatusDeparted, TripStatusCompleted, TripStatusCancelled:
		return true
	}
	return false
}

// Trip is a pure domain entity
type Trip struct {
	ID             int64
	ProviderID     int32
	BusID          int32
	OriginID       int32
	DestinationID  int32
	DepartureTime  time.Time
	ArrivalTime    time.Time
	BasePrice      float64
	PriceModifier  float64
	IsHotDeal      bool
	PickupPoints   []Point
	DropoffPoints  []Point
	BookedSeats    []string
	AvailableSeats int32
	Status         TripStatus
	CreatedAt      time.Time

	// Joined fields (for search results)
	ProviderName    string
	OriginName      string
	OriginCity      string
	DestinationName string
	DestinationCity string
}

type Point struct {
	Name      string  `json:"name"`
	Time      string  `json:"time"`
	Surcharge float64 `json:"surcharge"`
}

func (p Point) ToJSON() json.RawMessage {
	data, _ := json.Marshal(p)
	return data
}

type TripFilter struct {
	OriginID      *int32
	DestinationID *int32
	DepartureDate *time.Time
	MinSeats      int32
	ProviderID    *int32
	Status        *TripStatus
	Limit         int32
	Offset        int32
}

// Validation methods - return error code constants

func (t *Trip) ValidateProvider() (bool, string) {
	if t.ProviderID <= 0 {
		return false, ErrTripProviderRequired
	}
	return true, ""
}

func (t *Trip) ValidateOrigin() (bool, string) {
	if t.OriginID <= 0 {
		return false, ErrTripOriginRequired
	}
	return true, ""
}

func (t *Trip) ValidateDestination() (bool, string) {
	if t.DestinationID <= 0 {
		return false, ErrTripDestinationRequired
	}
	return true, ""
}

func (t *Trip) ValidateDepartureTime() (bool, string) {
	if t.DepartureTime.Before(time.Now()) {
		return false, ErrTripDepartureInPast
	}
	return true, ""
}

func (t *Trip) ValidateArrivalTime() (bool, string) {
	if t.ArrivalTime.Before(t.DepartureTime) {
		return false, ErrTripArrivalBeforeDeparture
	}
	return true, ""
}

func (t *Trip) ValidatePrice() (bool, string) {
	if t.BasePrice <= 0 {
		return false, ErrTripPriceInvalid
	}
	return true, ""
}

func (t *Trip) ValidateStatus() (bool, string) {
	if !t.Status.IsValid() {
		return false, ErrTripStatusInvalid
	}
	return true, ""
}

// Validate runs all validations and returns error codes
func (t *Trip) Validate() []string {
	var errs []string
	if valid, code := t.ValidateProvider(); !valid {
		errs = append(errs, code)
	}
	if valid, code := t.ValidateOrigin(); !valid {
		errs = append(errs, code)
	}
	if valid, code := t.ValidateDestination(); !valid {
		errs = append(errs, code)
	}
	if valid, code := t.ValidateDepartureTime(); !valid {
		errs = append(errs, code)
	}
	if valid, code := t.ValidateArrivalTime(); !valid {
		errs = append(errs, code)
	}
	if valid, code := t.ValidatePrice(); !valid {
		errs = append(errs, code)
	}
	return errs
}

// CanTransitionTo checks if status transition is valid
func (t *Trip) CanTransitionTo(newStatus TripStatus) (bool, string) {
	switch t.Status {
	case TripStatusScheduled:
		if newStatus == TripStatusDeparted || newStatus == TripStatusCancelled {
			return true, ""
		}
	case TripStatusDeparted:
		if newStatus == TripStatusCompleted {
			return true, ""
		}
	case TripStatusCompleted, TripStatusCancelled:
		// Terminal states
	}
	return false, ErrTripTransitionInvalid
}

// CanBeModified checks if trip can be updated
func (t *Trip) CanBeModified() (bool, string) {
	if t.Status != TripStatusScheduled {
		return false, ErrTripCannotModify
	}
	return true, ""
}

// CanBeDeleted checks if trip can be deleted
func (t *Trip) CanBeDeleted() (bool, string) {
	if t.Status != TripStatusScheduled {
		return false, ErrTripCannotDelete
	}
	return true, ""
}
