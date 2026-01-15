package dto

import (
	"backend/pkgs/paging"
	"time"
)

type SearchTripsRequest struct {
	OriginID      int    `form:"originId"`
	DestinationID int    `form:"destinationId"`
	DepartureDate string `form:"departureDate"` // YYYY-MM-DD
	MinSeats      int    `form:"minSeats"`
	paging.Paging
}

type CreateTripRequest struct {
	ProviderID     int       `json:"providerId" binding:"required"`
	BusID          int       `json:"busId" binding:"required"`
	OriginID       int       `json:"originId" binding:"required"`
	DestinationID  int       `json:"destinationId" binding:"required"`
	DepartureTime  time.Time `json:"departureTime" binding:"required"`
	ArrivalTime    time.Time `json:"arrivalTime" binding:"required"`
	BasePrice      float64   `json:"basePrice" binding:"required"`
	AvailableSeats int       `json:"availableSeats" binding:"required"`
	PickupPoints   []Point   `json:"pickupPoints"`
	DropoffPoints  []Point   `json:"dropoffPoints"`
}

type Point struct {
	Name      string  `json:"name"`
	Time      string  `json:"time"`
	Surcharge float64 `json:"surcharge"`
}

type TripResponse struct {
	ID              int64     `json:"id"`
	ProviderID      int       `json:"providerId"`
	ProviderName    string    `json:"providerName"`
	OriginName      string    `json:"originName"`
	OriginCity      string    `json:"originCity"`
	DestinationName string    `json:"destinationName"`
	DestinationCity string    `json:"destinationCity"`
	DepartureTime   time.Time `json:"departureTime"`
	ArrivalTime     time.Time `json:"arrivalTime"`
	BasePrice       float64   `json:"basePrice"`
	FinalPrice      float64   `json:"finalPrice"`
	AvailableSeats  int       `json:"availableSeats"`
	IsHotDeal       bool      `json:"isHotDeal"`
	Status          string    `json:"status"`
}

type TripListResponse struct {
	Trips      []TripResponse `json:"trips"`
	TotalPages int            `json:"totalPages"`
	paging.Paging
}
