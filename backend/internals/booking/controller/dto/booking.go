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
	PaymentMethod string       `json:"paymentMethod" binding:"required,oneof=bank_transfer cod visa"`
}

type GuestInfoDTO struct {
	Name  string `json:"name" binding:"required,min=2"`
	Phone string `json:"phone" binding:"required,min=10"`
	Email string `json:"email" binding:"omitempty,email"`
}

type PointInfoDTO struct {
	Name      string  `json:"name" binding:"required"`
	Time      string  `json:"time,omitempty"`
	Surcharge float64 `json:"surcharge,omitempty"`
}

type ListBookingsRequest struct {
	Page     int32 `form:"page,default=1" binding:"omitempty,min=1"`
	PageSize int32 `form:"pageSize,default=20" binding:"omitempty,min=1,max=50"`
	Limit    int32 `form:"limit" binding:"omitempty,min=1,max=50"`
	Offset   int32 `form:"offset" binding:"omitempty,min=0"`
}

// =============================================================================
// RESPONSES
// =============================================================================

type BookingResponse struct {
	ID              int64        `json:"id"`
	Code            string       `json:"code"`
	TripID          int64        `json:"tripId"`
	SeatCodes       []string     `json:"seatCodes"`
	GuestInfo       GuestInfoDTO `json:"guestInfo"`
	PickupInfo      PointInfoDTO `json:"pickupInfo"`
	DropoffInfo     PointInfoDTO `json:"dropoffInfo"`
	TotalAmount     float64      `json:"totalAmount"`
	Status          string       `json:"status"`
	PaymentMethod   string       `json:"paymentMethod"`
	ExpiresAt       string       `json:"expiresAt,omitempty"`
	RefundedAt      string       `json:"refundedAt,omitempty"`
	RefundReference string       `json:"refundReference,omitempty"`
	RefundNote      string       `json:"refundNote,omitempty"`
	CreatedAt       string       `json:"createdAt"`
	UpdatedAt       string       `json:"updatedAt"`
}

type BookingDetailResponse struct {
	BookingResponse
	DepartureTime   string `json:"departureTime,omitempty"`
	ArrivalTime     string `json:"arrivalTime,omitempty"`
	OriginName      string `json:"originName,omitempty"`
	DestinationName string `json:"destinationName,omitempty"`
}

type BookingListResponse struct {
	Items    []*BookingDetailResponse `json:"items"`
	Total    int64                    `json:"total"`
	Page     int32                    `json:"page"`
	PageSize int32                    `json:"pageSize"`
}

type CreateBookingResponse struct {
	Booking    *BookingResponse `json:"booking"`
	OrderCode  string           `json:"orderCode"`
	PaymentURL string           `json:"paymentUrl,omitempty"`
	QRCode     string           `json:"qrCode,omitempty"`
	ResumeURL  string           `json:"resumeUrl,omitempty"`
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
			Name:      r.PickupInfo.Name,
			Time:      r.PickupInfo.Time,
			Surcharge: r.PickupInfo.Surcharge,
		},
		DropoffInfo: domain.PointInfo{
			Name:      r.DropoffInfo.Name,
			Time:      r.DropoffInfo.Time,
			Surcharge: r.DropoffInfo.Surcharge,
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
			Name:      b.PickupInfo.Name,
			Time:      b.PickupInfo.Time,
			Surcharge: b.PickupInfo.Surcharge,
		},
		DropoffInfo: PointInfoDTO{
			Name:      b.DropoffInfo.Name,
			Time:      b.DropoffInfo.Time,
			Surcharge: b.DropoffInfo.Surcharge,
		},
		TotalAmount:   b.TotalAmount,
		Status:        string(b.Status),
		PaymentMethod: b.PaymentMethod,
		CreatedAt:     b.CreatedAt.Format(time.RFC3339),
		UpdatedAt:     b.UpdatedAt.Format(time.RFC3339),
	}
	if !b.ExpiresAt.IsZero() {
		resp.ExpiresAt = b.ExpiresAt.Format(time.RFC3339)
	}
	if !b.RefundedAt.IsZero() {
		resp.RefundedAt = b.RefundedAt.Format(time.RFC3339)
	}
	resp.RefundReference = b.RefundReference
	resp.RefundNote = b.RefundNote
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
		Items:    bookings,
		Total:    output.Total,
		Page:     output.Page,
		PageSize: output.PageSize,
	}
}

func ToCreateBookingResponse(output *domain.BookingOutput) *CreateBookingResponse {
	return &CreateBookingResponse{
		Booking:    ToBookingResponse(output.Booking),
		OrderCode:  output.OrderCode,
		PaymentURL: output.PaymentURL,
		QRCode:     output.QRCode,
		ResumeURL:  output.ResumeURL,
	}
}

// =============================================================================
// ADMIN REFUND DTOs
// =============================================================================

type ListRefundRequestsParams struct {
	Page     int32 `form:"page,default=1" binding:"omitempty,min=1"`
	PageSize int32 `form:"pageSize,default=20" binding:"omitempty,min=1,max=50"`
}

type RefundActionRequest struct {
	Reason          string `json:"reason" binding:"omitempty,max=500"`
	RefundReference string `json:"refundReference" binding:"omitempty,max=100"`
	RefundNote      string `json:"refundNote" binding:"omitempty,max=500"`
}

type RefundRequestListResponse struct {
	Items    []*BookingDetailResponse `json:"items"`
	Total    int64                    `json:"total"`
	Page     int32                    `json:"page"`
	PageSize int32                    `json:"pageSize"`
}

func ToRefundRequestListResponse(output *domain.RefundRequestListOutput) *RefundRequestListResponse {
	bookings := make([]*BookingDetailResponse, len(output.Bookings))
	for i, b := range output.Bookings {
		bookings[i] = ToBookingDetailResponse(b)
	}
	return &RefundRequestListResponse{
		Items:    bookings,
		Total:    output.Total,
		Page:     output.Page,
		PageSize: output.PageSize,
	}
}
