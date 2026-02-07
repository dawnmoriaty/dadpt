package domain

import "time"

// TripFilter is used by the repository for filtering queries
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

// =============================================================================
// INPUT DTOs - Used by UseCase layer
// =============================================================================

// CreateTripInput is the input for creating a new trip
type CreateTripInput struct {
	ProviderID     int32
	BusID          int32
	OriginID       int32
	DestinationID  int32
	DepartureTime  time.Time
	ArrivalTime    time.Time
	BasePrice      float64
	AvailableSeats int32
	PickupPoints   []Point
	DropoffPoints  []Point
}

// UpdateTripInput is the input for updating a trip (partial update)
type UpdateTripInput struct {
	DepartureTime *time.Time
	ArrivalTime   *time.Time
	BasePrice     *float64
	IsHotDeal     *bool
	PickupPoints  []Point
	DropoffPoints []Point
}

// SearchTripsInput is the input for searching trips (public)
type SearchTripsInput struct {
	OriginID      int32
	DestinationID int32
	DepartureDate string // YYYY-MM-DD
	MinSeats      int
	Page          int
	Limit         int
}

// AdminListInput is the input for listing trips (admin)
type AdminListInput struct {
	ProviderID *int
	Status     *string
}
