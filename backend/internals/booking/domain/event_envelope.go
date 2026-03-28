package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"backend/pkgs/messaging"
)

const (
	AggregateTypeBooking = "booking"
	EventVersionV1       = 1
	EventSourceBackend   = "backend"
)

type BookingEventPayload struct {
	BookingID  int64    `json:"bookingId"`
	UserID     *int64   `json:"userId,omitempty"`
	Code       string   `json:"code"`
	TripID     int64    `json:"tripId"`
	SeatCodes  []string `json:"seatCodes"`
	Amount     float64  `json:"amount"`
	Status     string   `json:"status"`
	GuestName  string   `json:"guestName"`
	GuestPhone string   `json:"guestPhone"`
}



func NewBookingEventEnvelope(eventType string, booking *Booking, correlationID string) []byte {
	payload, _ := json.Marshal(BookingEventPayload{
		BookingID:  booking.ID,
		UserID:     booking.UserID,
		Code:       string(booking.Code),
		TripID:     booking.TripID,
		SeatCodes:  booking.SeatCodes,
		Amount:     booking.TotalAmount,
		Status:     string(booking.Status),
		GuestName:  booking.GuestInfo.Name,
		GuestPhone: booking.GuestInfo.Phone,
	})

	envelope := messaging.EventEnvelope{
		EventID:       uuid.NewString(),
		CorrelationID: correlationID,
		EventType:     eventType,
		Version:       EventVersionV1,
		AggregateType: AggregateTypeBooking,
		AggregateID:   booking.ID,
		OccurredAt:    time.Now().UTC(),
		Source:        EventSourceBackend,
		Payload:       payload,
	}

	envelopeBytes, _ := json.Marshal(envelope)
	return envelopeBytes
}
