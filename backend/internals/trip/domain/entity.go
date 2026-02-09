package domain

import (
	"encoding/json"
	"errors"
	"time"
)

// =============================================================================
// SENTINEL ERRORS — stable English identifiers for errors.Is() matching.
// User-facing messages are resolved by the i18n translator at the HTTP edge.
// =============================================================================

var (
	ErrTripNotFound            = errors.New("trip not found")
	ErrInvalidInput            = errors.New("invalid input")
	ErrTripStatusInvalid       = errors.New("invalid trip status")
	ErrTripTransitionInvalid   = errors.New("invalid trip status transition")
	ErrTripDepartureInPast     = errors.New("departure time in past")
	ErrArrivalBeforeDeparture  = errors.New("arrival before departure")
	ErrTripProviderRequired    = errors.New("trip provider required")
	ErrTripOriginRequired      = errors.New("trip origin required")
	ErrTripDestinationRequired = errors.New("trip destination required")
	ErrTripPriceInvalid        = errors.New("trip price invalid")
	ErrTripCannotModify        = errors.New("trip cannot modify")
	ErrTripCannotDelete        = errors.New("trip cannot delete")
	ErrTripHasActiveBookings   = errors.New("trip has active bookings")
)

// =============================================================================
// VALUE OBJECTS
// =============================================================================

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

func (s TripStatus) String() string {
	return string(s)
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

// =============================================================================
// CORE ENTITY
// =============================================================================

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

// =============================================================================
// VALIDATION METHODS - All business rules live here
// =============================================================================

func (t *Trip) Validate() error {
	if t.ProviderID <= 0 {
		return ErrTripProviderRequired
	}
	if t.OriginID <= 0 {
		return ErrTripOriginRequired
	}
	if t.DestinationID <= 0 {
		return ErrTripDestinationRequired
	}
	if t.DepartureTime.Before(time.Now()) {
		return ErrTripDepartureInPast
	}
	if t.ArrivalTime.Before(t.DepartureTime) {
		return ErrArrivalBeforeDeparture
	}
	if t.BasePrice <= 0 {
		return ErrTripPriceInvalid
	}
	return nil
}

// CanTransitionTo checks if status transition is valid
func (t *Trip) CanTransitionTo(newStatus TripStatus) error {
	switch t.Status {
	case TripStatusScheduled:
		if newStatus == TripStatusDeparted || newStatus == TripStatusCancelled {
			return nil
		}
	case TripStatusDeparted:
		if newStatus == TripStatusCompleted {
			return nil
		}
	case TripStatusCompleted, TripStatusCancelled:
		// Terminal states
	}
	return ErrTripTransitionInvalid
}

// CanBeModified checks if trip can be updated
func (t *Trip) CanBeModified() error {
	if t.Status != TripStatusScheduled {
		return ErrTripCannotModify
	}
	return nil
}

// CanBeDeleted checks if trip can be deleted
func (t *Trip) CanBeDeleted() error {
	if t.Status != TripStatusScheduled {
		return ErrTripCannotDelete
	}
	return nil
}

// FinalPrice calculates the final price with modifier
func (t *Trip) FinalPrice() float64 {
	return t.BasePrice * t.PriceModifier
}
