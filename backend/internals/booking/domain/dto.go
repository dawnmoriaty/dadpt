package domain


type CreateBookingInput struct {
	TripID        int64
	UserID        *int64
	SeatCodes     []string
	GuestInfo     GuestInfo
	PickupInfo    PointInfo
	DropoffInfo   PointInfo
	PaymentMethod string
}

type CancelBookingInput struct {
	BookingID int64
	UserID    *int64 // For authorization check
}

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

type ConfirmPaymentInput struct {
	OrderCode   string
	Status      string // "success" or "failed"
	WebhookData []byte // Raw webhook payload for audit
}


type BookingOutput struct {
	Booking    *Booking
	TripInfo   *TripSnapshot
	OrderCode  string // For payment gateway
	PaymentURL string // Checkout URL from PayOS
	QRCode     string // QR code data from PayOS
	ResumeURL  string
}

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

type PaymentConfirmOutput struct {
	Booking *Booking
	Payment *PaymentTransaction
}


type RefundRequestInput struct {
	BookingID       int64
	Reason          string
	RefundReference string
	RefundNote      string
	ConfirmCode     string
}

type RefundRequestListInput struct {
	Limit    int32
	Offset   int32
	Page     int32
	PageSize int32
}

type RefundRequestListOutput struct {
	Bookings []*Booking
	Total    int64
	Page     int32
	PageSize int32
}
