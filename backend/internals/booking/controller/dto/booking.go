package dto

import (
	"time"

	"backend/internals/booking/domain"
)

// =============================================================================
// REQUESTS
// =============================================================================

type CreateBookingRequest struct {
	TripID        int64        `json:"tripId" binding:"required"`
	SeatCodes     []string     `json:"seatCodes" binding:"required,min=1"`
	GuestInfo     GuestInfoDTO `json:"guestInfo" binding:"required"`
	PickupInfo    PointInfoDTO `json:"pickupInfo" binding:"required"`
	DropoffInfo   PointInfoDTO `json:"dropoffInfo" binding:"required"`
	PaymentMethod string       `json:"paymentMethod" binding:"required,oneof=vnpay momo cod"`
}

type GuestInfoDTO struct {
	Name  string `json:"name" binding:"required,min=2"`
	Phone string `json:"phone" binding:"required,min=10"`
	Email string `json:"email" binding:"omitempty,email"`
}

type PointInfoDTO struct {
	Name string `json:"name" binding:"required"`
}

type ListBookingsRequest struct {
	Limit  int32 `form:"limit,default=10" binding:"min=1,max=50"`
	Offset int32 `form:"offset,default=0" binding:"min=0"`
}

// =============================================================================
// RESPONSES
// =============================================================================

type BookingResponse struct {
	ID            int64        `json:"id"`
	Code          string       `json:"code"`
	TripID        int64        `json:"tripId"`
	SeatCodes     []string     `json:"seatCodes"`
	GuestInfo     GuestInfoDTO `json:"guestInfo"`
	PickupInfo    PointInfoDTO `json:"pickupInfo"`
	DropoffInfo   PointInfoDTO `json:"dropoffInfo"`
	TotalAmount   float64      `json:"totalAmount"`
	Status        string       `json:"status"`
	PaymentMethod string       `json:"paymentMethod"`
	ExpiresAt     string       `json:"expiresAt,omitempty"`
	CreatedAt     string       `json:"createdAt"`
}

type BookingDetailResponse struct {
	BookingResponse
	DepartureTime   string `json:"departureTime,omitempty"`
	ArrivalTime     string `json:"arrivalTime,omitempty"`
	OriginName      string `json:"originName,omitempty"`
	DestinationName string `json:"destinationName,omitempty"`
}

type BookingListResponse struct {
	Bookings []*BookingDetailResponse `json:"bookings"`
	Total    int64                    `json:"total"`
}

type CreateBookingResponse struct {
	Booking    *BookingResponse `json:"booking"`
	OrderCode  string           `json:"orderCode"`
	PaymentURL string           `json:"paymentUrl,omitempty"`
}

// =============================================================================
// MAPPERS - Request to Domain
// =============================================================================

func (r *CreateBookingRequest) ToInput(userID *int64) *domain.CreateBookingInput {
	return &domain.CreateBookingInput{
		TripID:    r.TripID,
		UserID:    userID,
		SeatCodes: r.SeatCodes,
		GuestInfo: domain.GuestInfo{
			Name:  r.GuestInfo.Name,
			Phone: r.GuestInfo.Phone,
			Email: r.GuestInfo.Email,
		},
		PickupInfo: domain.PointInfo{
			Name: r.PickupInfo.Name,
		},
		DropoffInfo: domain.PointInfo{
			Name: r.DropoffInfo.Name,
		},
		PaymentMethod: r.PaymentMethod,
	}
}

// =============================================================================
// MAPPERS - Domain to Response
// =============================================================================

func ToBookingResponse(b *domain.Booking) *BookingResponse {
	resp := &BookingResponse{
		ID:        b.ID,
		Code:      string(b.Code),
		TripID:    b.TripID,
		SeatCodes: b.SeatCodes,
		GuestInfo: GuestInfoDTO{
			Name:  b.GuestInfo.Name,
			Phone: b.GuestInfo.Phone,
			Email: b.GuestInfo.Email,
		},
		PickupInfo: PointInfoDTO{
			Name: b.PickupInfo.Name,
		},
		DropoffInfo: PointInfoDTO{
			Name: b.DropoffInfo.Name,
		},
		TotalAmount:   b.TotalAmount,
		Status:        string(b.Status),
		PaymentMethod: b.PaymentMethod,
		CreatedAt:     b.CreatedAt.Format(time.RFC3339),
	}
	if !b.ExpiresAt.IsZero() {
		resp.ExpiresAt = b.ExpiresAt.Format(time.RFC3339)
	}
	return resp
}

func ToBookingDetailResponse(b *domain.Booking) *BookingDetailResponse {
	resp := &BookingDetailResponse{
		BookingResponse: *ToBookingResponse(b),
	}
	if !b.DepartureTime.IsZero() {
		resp.DepartureTime = b.DepartureTime.Format(time.RFC3339)
	}
	if !b.ArrivalTime.IsZero() {
		resp.ArrivalTime = b.ArrivalTime.Format(time.RFC3339)
	}
	resp.OriginName = b.OriginName
	resp.DestinationName = b.DestinationName
	return resp
}

func ToBookingListResponse(output *domain.BookingListOutput) *BookingListResponse {
	bookings := make([]*BookingDetailResponse, len(output.Bookings))
	for i, b := range output.Bookings {
		bookings[i] = ToBookingDetailResponse(b)
	}
	return &BookingListResponse{
		Bookings: bookings,
		Total:    output.Total,
	}
}

func ToCreateBookingResponse(output *domain.BookingOutput) *CreateBookingResponse {
	return &CreateBookingResponse{
		Booking:    ToBookingResponse(output.Booking),
		OrderCode:  output.OrderCode,
		PaymentURL: output.PaymentURL,
	}
}
