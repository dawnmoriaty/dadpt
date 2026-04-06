package domain

import (
	"encoding/json"
	"errors"
	"time"
)


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

	ProviderName    string
	BusTypeName     string
	SeatLayout      json.RawMessage
	OriginName      string
	OriginCity      string
	DestinationName string
	DestinationCity string

	BusImageURL string
}


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
	}
	return ErrTripTransitionInvalid
}

func (t *Trip) CanBeModified() error {
	if t.Status != TripStatusScheduled {
		return ErrTripCannotModify
	}
	return nil
}

func (t *Trip) CanBeDeleted() error {
	if t.Status != TripStatusScheduled {
		return ErrTripCannotDelete
	}
	return nil
}

func (t *Trip) FinalPrice() float64 {
	return t.BasePrice * t.PriceModifier
}
