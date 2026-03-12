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

// ConfirmPaymentInput is the input from the payment webhook
type ConfirmPaymentInput struct {
	OrderCode   string
	Status      string // "success" or "failed"
	WebhookData []byte // Raw webhook payload for audit
}

// =============================================================================
// OUTPUT DTOs - Returned by UseCase layer
// =============================================================================

// BookingOutput is the output from booking operations
type BookingOutput struct {
	Booking    *Booking
	TripInfo   *TripSnapshot
	OrderCode  string // For payment gateway
	PaymentURL string // Checkout URL from PayOS
	QRCode     string // QR code data from PayOS
}

// BookingListOutput is the output from listing bookings
type BookingListOutput struct {
	Bookings []*Booking
	Total    int64
}

// PaymentConfirmOutput is the output from payment confirmation
type PaymentConfirmOutput struct {
	Booking *Booking
	Payment *PaymentTransaction
}
