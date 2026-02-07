package dto

import (
	"time"

	"backend/internals/trip/domain"
	"backend/pkgs/datetime"
)

// =============================================================================
// REQUESTS
// =============================================================================

type SearchTripsRequest struct {
	OriginID      int    `form:"originId" binding:"required"`
	DestinationID int    `form:"destinationId" binding:"required"`
	DepartureDate string `form:"departureDate" binding:"required"` // YYYY-MM-DD
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
	PickupPoints   []PointDTO            `json:"pickupPoints"`
	DropoffPoints  []PointDTO            `json:"dropoffPoints"`
}

type UpdateTripRequest struct {
	DepartureTime *datetime.FlexibleTime `json:"departureTime"`
	ArrivalTime   *datetime.FlexibleTime `json:"arrivalTime"`
	BasePrice     *float64               `json:"basePrice"`
	IsHotDeal     *bool                  `json:"isHotDeal"`
	PickupPoints  []PointDTO             `json:"pickupPoints"`
	DropoffPoints []PointDTO             `json:"dropoffPoints"`
}

type UpdateTripStatusRequest struct {
	Status string `json:"status" binding:"required"`
}

type AdminTripListRequest struct {
	ProviderID *int    `form:"providerId"`
	Status     *string `form:"status"`
}

type PointDTO struct {
	Name      string  `json:"name"`
	Time      string  `json:"time"`
	Surcharge float64 `json:"surcharge"`
}

// =============================================================================
// RESPONSES
// =============================================================================

type TripResponse struct {
	ID              int64     `json:"id"`
	ProviderID      int       `json:"providerId"`
	ProviderName    string    `json:"providerName,omitempty"`
	OriginName      string    `json:"originName,omitempty"`
	OriginCity      string    `json:"originCity,omitempty"`
	DestinationName string    `json:"destinationName,omitempty"`
	DestinationCity string    `json:"destinationCity,omitempty"`
	DepartureTime   time.Time `json:"departureTime"`
	ArrivalTime     time.Time `json:"arrivalTime"`
	BasePrice       float64   `json:"basePrice"`
	FinalPrice      float64   `json:"finalPrice"`
	AvailableSeats  int       `json:"availableSeats"`
	IsHotDeal       bool      `json:"isHotDeal"`
	Status          string    `json:"status"`
}

// =============================================================================
// MAPPERS - Request to Domain
// =============================================================================

func (r *CreateTripRequest) ToInput() *domain.CreateTripInput {
	return &domain.CreateTripInput{
		ProviderID:     int32(r.ProviderID),
		BusID:          int32(r.BusID),
		OriginID:       int32(r.OriginID),
		DestinationID:  int32(r.DestinationID),
		DepartureTime:  r.DepartureTime.ToTime(),
		ArrivalTime:    r.ArrivalTime.ToTime(),
		BasePrice:      r.BasePrice,
		AvailableSeats: int32(r.AvailableSeats),
		PickupPoints:   pointsDTOToDomain(r.PickupPoints),
		DropoffPoints:  pointsDTOToDomain(r.DropoffPoints),
	}
}

func (r *UpdateTripRequest) ToInput() *domain.UpdateTripInput {
	input := &domain.UpdateTripInput{
		BasePrice:     r.BasePrice,
		IsHotDeal:     r.IsHotDeal,
		PickupPoints:  pointsDTOToDomain(r.PickupPoints),
		DropoffPoints: pointsDTOToDomain(r.DropoffPoints),
	}
	if r.DepartureTime != nil {
		input.DepartureTime = r.DepartureTime.ToTimePtr()
	}
	if r.ArrivalTime != nil {
		input.ArrivalTime = r.ArrivalTime.ToTimePtr()
	}
	return input
}

func (r *SearchTripsRequest) ToInput() *domain.SearchTripsInput {
	return &domain.SearchTripsInput{
		OriginID:      int32(r.OriginID),
		DestinationID: int32(r.DestinationID),
		DepartureDate: r.DepartureDate,
		MinSeats:      r.MinSeats,
		Page:          r.Page,
		Limit:         r.Limit,
	}
}

func (r *AdminTripListRequest) ToInput() *domain.AdminListInput {
	return &domain.AdminListInput{
		ProviderID: r.ProviderID,
		Status:     r.Status,
	}
}

// =============================================================================
// MAPPERS - Domain to Response
// =============================================================================

func ToTripResponse(trip *domain.Trip) *TripResponse {
	return &TripResponse{
		ID:              trip.ID,
		ProviderID:      int(trip.ProviderID),
		ProviderName:    trip.ProviderName,
		OriginName:      trip.OriginName,
		OriginCity:      trip.OriginCity,
		DestinationName: trip.DestinationName,
		DestinationCity: trip.DestinationCity,
		DepartureTime:   trip.DepartureTime,
		ArrivalTime:     trip.ArrivalTime,
		BasePrice:       trip.BasePrice,
		FinalPrice:      trip.FinalPrice(),
		AvailableSeats:  int(trip.AvailableSeats),
		IsHotDeal:       trip.IsHotDeal,
		Status:          trip.Status.String(),
	}
}

func ToTripResponseList(trips []*domain.Trip) []TripResponse {
	items := make([]TripResponse, len(trips))
	for i, trip := range trips {
		items[i] = *ToTripResponse(trip)
	}
	return items
}

// =============================================================================
// HELPERS
// =============================================================================

func pointsDTOToDomain(points []PointDTO) []domain.Point {
	if points == nil {
		return nil
	}
	result := make([]domain.Point, len(points))
	for i, p := range points {
		result[i] = domain.Point{
			Name:      p.Name,
			Time:      p.Time,
			Surcharge: p.Surcharge,
		}
	}
	return result
}
