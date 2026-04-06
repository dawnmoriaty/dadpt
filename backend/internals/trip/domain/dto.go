package domain

import "time"

type TripFilter struct {
	OriginID      *int32
	DestinationID *int32
	DepartureDate *time.Time
	MinSeats      int32
	ProviderID    *int32
	BusTypeID     *int32
	Status        *TripStatus
	Limit         int32
	Offset        int32
}


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

type UpdateTripInput struct {
	OriginID       *int32
	DestinationID  *int32
	DepartureTime  *time.Time
	ArrivalTime    *time.Time
	BasePrice      *float64
	AvailableSeats *int32
	IsHotDeal      *bool
	PickupPoints   []Point
	DropoffPoints  []Point
}

type SearchTripsInput struct {
	OriginID      int32
	DestinationID int32
	DepartureDate string // YYYY-MM-DD
	MinSeats      int
	Page          int
	Limit         int
}

type BrowseTripsInput struct {
	ProviderID *int
	BusTypeID  *int
	Page       int
	Limit      int
}

type AdminListInput struct {
	ProviderID *int
	Status     *string
}
