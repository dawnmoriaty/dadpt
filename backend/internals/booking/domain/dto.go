package domain

// =============================================================================
// INPUT DTOs - Used by UseCase layer
// =============================================================================

// CreateBookingInput is the input for creating a new booking
type CreateBookingInput struct {
	TripID        int64
	UserID        *int64
	SeatCodes     []string
	GuestInfo     GuestInfo
	PickupInfo    PointInfo
	DropoffInfo   PointInfo
	PaymentMethod string
}

// CancelBookingInput is the input for cancelling a booking
type CancelBookingInput struct {
	BookingID int64
	UserID    *int64 // For authorization check
}

// ListBookingsInput is the input for listing user's bookings
type ListBookingsInput struct {
	UserID int64
	Limit  int32
	Offset int32
}

// =============================================================================
// OUTPUT DTOs - Returned by UseCase layer
// =============================================================================

// BookingOutput is the output from booking operations
type BookingOutput struct {
	Booking    *Booking
	TripInfo   *TripSnapshot
	PaymentURL string // For redirect to payment gateway
}

// BookingListOutput is the output from listing bookings
type BookingListOutput struct {
	Bookings []*Booking
	Total    int64
}
