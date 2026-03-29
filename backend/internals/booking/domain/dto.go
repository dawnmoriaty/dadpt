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
	UserID   int64
	Limit    int32
	Offset   int32
	Page     int32
	PageSize int32
}

type AdminBookingListInput struct {
	Limit    int32
	Offset   int32
	Page     int32
	PageSize int32
	Status   string
	TripID   int64
	Search   string
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
	ResumeURL  string
}

// BookingListOutput is the output from listing bookings
type BookingListOutput struct {
	Bookings []*Booking
	Total    int64
	Page     int32
	PageSize int32
}

type AdminBookingStatsOutput struct {
	TotalBookings         int64
	UnpaidBookings        int64
	PaidBookings          int64
	RefundPendingBookings int64
	CancelledBookings     int64
	PaidRevenue           float64
	UnpaidRevenue         float64
	ActiveTripCount       int64
}

type AdminUpdateBookingStatusInput struct {
	BookingID int64
	Status    BookingStatus
}

type AdminRevenueSeriesPoint struct {
	Date           string
	TotalBookings  int64
	PaidBookings   int64
	UnpaidBookings int64
	PaidRevenue    float64
}

type AdminRevenueSeriesOutput struct {
	Days  int32
	Items []*AdminRevenueSeriesPoint
}

type TripSeatManifestOutput struct {
	TripID    int64
	Bookings  []*Booking
	SeatCount int64
}

// PaymentConfirmOutput is the output from payment confirmation
type PaymentConfirmOutput struct {
	Booking *Booking
	Payment *PaymentTransaction
}

// =============================================================================
// ADMIN REFUND DTOs
// =============================================================================

// RefundRequestInput is the input for admin approve/reject refund
type RefundRequestInput struct {
	BookingID       int64
	Reason          string
	RefundReference string
	RefundNote      string
	ConfirmCode     string
}

// RefundRequestListInput is the input for listing refund requests
type RefundRequestListInput struct {
	Limit    int32
	Offset   int32
	Page     int32
	PageSize int32
}

// RefundRequestListOutput is the output from listing refund requests
type RefundRequestListOutput struct {
	Bookings []*Booking
	Total    int64
	Page     int32
	PageSize int32
}
