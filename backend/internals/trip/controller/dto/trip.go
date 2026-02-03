package dto

import (
	"time"

	"backend/pkgs/datetime"
)

type SearchTripsRequest struct {
	OriginID      int    `form:"originId"`
	DestinationID int    `form:"destinationId"`
	DepartureDate string `form:"departureDate"` // YYYY-MM-DD
	MinSeats      int    `form:"minSeats"`
	Page          int    `form:"page"`
	Limit         int    `form:"limit"`
}

type CreateTripRequest struct {
	ProviderID     int                   `json:"providerId" binding:"required"`
	BusID          int                   `json:"busId" binding:"required"`
	OriginID       int                   `json:"originId" binding:"required"`
	DestinationID  int                   `json:"destinationId" binding:"required"`
	DepartureTime  datetime.FlexibleTime `json:"departureTime" binding:"required"`
	ArrivalTime    datetime.FlexibleTime `json:"arrivalTime" binding:"required"`
	BasePrice      float64               `json:"basePrice" binding:"required"`
	AvailableSeats int                   `json:"availableSeats" binding:"required"`
	PickupPoints   []Point               `json:"pickupPoints"`
	DropoffPoints  []Point               `json:"dropoffPoints"`
}

// GetDepartureTime returns departure time as time.Time
func (r *CreateTripRequest) GetDepartureTime() time.Time {
	return r.DepartureTime.ToTime()
}

// GetArrivalTime returns arrival time as time.Time
func (r *CreateTripRequest) GetArrivalTime() time.Time {
	return r.ArrivalTime.ToTime()
}

type UpdateTripRequest struct {
	DepartureTime *datetime.FlexibleTime `json:"departureTime"`
	ArrivalTime   *datetime.FlexibleTime `json:"arrivalTime"`
	BasePrice     *float64               `json:"basePrice"`
	IsHotDeal     *bool                  `json:"isHotDeal"`
	PickupPoints  []Point                `json:"pickupPoints"`
	DropoffPoints []Point                `json:"dropoffPoints"`
}

// GetDepartureTime returns departure time as *time.Time
func (r *UpdateTripRequest) GetDepartureTime() *time.Time {
	if r.DepartureTime == nil {
		return nil
	}
	return r.DepartureTime.ToTimePtr()
}

// GetArrivalTime returns arrival time as *time.Time
func (r *UpdateTripRequest) GetArrivalTime() *time.Time {
	if r.ArrivalTime == nil {
		return nil
	}
	return r.ArrivalTime.ToTimePtr()
}

type UpdateTripStatusRequest struct {
	Status string `json:"status" binding:"required"`
}

type AdminTripListRequest struct {
	ProviderID *int    `form:"providerId"`
	Status     *string `form:"status"`
	Page       int     `form:"page"`
	Limit      int     `form:"limit"`
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
}
