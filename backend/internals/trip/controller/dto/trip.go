package dto

import (
	"encoding/json"
	"time"

	"backend/internals/trip/domain"
	"backend/pkgs/utils"
)

type SearchTripsRequest struct {
	OriginID      int    `form:"originId" binding:"required"`
	DestinationID int    `form:"destinationId" binding:"required"`
	DepartureDate string `form:"departureDate" binding:"required"` // YYYY-MM-DD
	MinSeats      int    `form:"minSeats"`
	Page          int    `form:"page"`
	Limit         int    `form:"limit"`
}

type CreateTripRequest struct {
	ProviderID     int                `json:"providerId" binding:"required"`
	BusID          int                `json:"busId" binding:"required"`
	OriginID       int                `json:"originId" binding:"required"`
	DestinationID  int                `json:"destinationId" binding:"required"`
	DepartureTime  utils.FlexibleTime `json:"departureTime" binding:"required"`
	ArrivalTime    utils.FlexibleTime `json:"arrivalTime" binding:"required"`
	BasePrice      float64            `json:"basePrice" binding:"required"`
	AvailableSeats int                `json:"availableSeats" binding:"required"`
	PickupPoints   []PointDTO         `json:"pickupPoints"`
	DropoffPoints  []PointDTO         `json:"dropoffPoints"`
}

type UpdateTripRequest struct {
	OriginID       *int                `json:"originId" binding:"omitempty,min=1"`
	DestinationID  *int                `json:"destinationId" binding:"omitempty,min=1"`
	DepartureTime  *utils.FlexibleTime `json:"departureTime"`
	ArrivalTime    *utils.FlexibleTime `json:"arrivalTime"`
	BasePrice      *float64            `json:"basePrice"`
	AvailableSeats *int                `json:"availableSeats" binding:"omitempty,min=1"`
	IsHotDeal      *bool               `json:"isHotDeal"`
	PickupPoints   []PointDTO          `json:"pickupPoints"`
	DropoffPoints  []PointDTO          `json:"dropoffPoints"`
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

type TripResponse struct {
	ID              int64      `json:"id"`
	ProviderID      int        `json:"providerId"`
	BusID           int        `json:"busId"`
	OriginID        int        `json:"originId"`
	DestinationID   int        `json:"destinationId"`
	ProviderName    string     `json:"providerName,omitempty"`
	BusTypeName     string     `json:"busTypeName,omitempty"`
	OriginName      string     `json:"originName,omitempty"`
	OriginCity      string     `json:"originCity,omitempty"`
	DestinationName string     `json:"destinationName,omitempty"`
	DestinationCity string     `json:"destinationCity,omitempty"`
	DepartureTime   time.Time  `json:"departureTime"`
	ArrivalTime     time.Time  `json:"arrivalTime"`
	BasePrice       float64    `json:"basePrice"`
	FinalPrice      float64    `json:"finalPrice"`
	AvailableSeats  int        `json:"availableSeats"`
	IsHotDeal       bool       `json:"isHotDeal"`
	Status          string     `json:"status"`
	PickupPoints    []PointDTO `json:"pickupPoints"`
	DropoffPoints   []PointDTO `json:"dropoffPoints"`
	BookedSeats     []string   `json:"bookedSeats"`

	// Image URL from related bus
	BusImageURL string `json:"busImageUrl,omitempty"`

	// Seat layout from bus type (JSONB)
	SeatLayout json.RawMessage `json:"seatLayout,omitempty"`
}

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
	if r.OriginID != nil {
		originID := int32(*r.OriginID)
		input.OriginID = &originID
	}
	if r.DestinationID != nil {
		destinationID := int32(*r.DestinationID)
		input.DestinationID = &destinationID
	}
	if r.DepartureTime != nil {
		input.DepartureTime = r.DepartureTime.ToTimePtr()
	}
	if r.ArrivalTime != nil {
		input.ArrivalTime = r.ArrivalTime.ToTimePtr()
	}
	if r.AvailableSeats != nil {
		availableSeats := int32(*r.AvailableSeats)
		input.AvailableSeats = &availableSeats
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

type BrowseTripsRequest struct {
	ProviderID *int `form:"providerId"`
	BusTypeID  *int `form:"busTypeId"`
	Page       int  `form:"page"`
	Limit      int  `form:"limit"`
}

func (r *BrowseTripsRequest) ToInput() *domain.BrowseTripsInput {
	return &domain.BrowseTripsInput{
		ProviderID: r.ProviderID,
		BusTypeID:  r.BusTypeID,
		Page:       r.Page,
		Limit:      r.Limit,
	}
}

func ToTripResponse(trip *domain.Trip) *TripResponse {
	return &TripResponse{
		ID:              trip.ID,
		ProviderID:      int(trip.ProviderID),
		BusID:           int(trip.BusID),
		OriginID:        int(trip.OriginID),
		DestinationID:   int(trip.DestinationID),
		ProviderName:    trip.ProviderName,
		BusTypeName:     trip.BusTypeName,
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
		PickupPoints:    pointsDomainToDTO(trip.PickupPoints),
		DropoffPoints:   pointsDomainToDTO(trip.DropoffPoints),
		BookedSeats:     trip.BookedSeats,
		BusImageURL:     trip.BusImageURL,
		SeatLayout:      trip.SeatLayout,
	}
}

func ToTripResponseList(trips []*domain.Trip) []TripResponse {
	items := make([]TripResponse, len(trips))
	for i, trip := range trips {
		items[i] = *ToTripResponse(trip)
	}
	return items
}

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

func pointsDomainToDTO(points []domain.Point) []PointDTO {
	if points == nil {
		return []PointDTO{}
	}
	result := make([]PointDTO, len(points))
	for i, p := range points {
		result[i] = PointDTO{
			Name:      p.Name,
			Time:      p.Time,
			Surcharge: p.Surcharge,
		}
	}
	return result
}
