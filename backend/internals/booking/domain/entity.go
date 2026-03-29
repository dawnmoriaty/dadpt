package domain

import (
	"errors"
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
)

// =============================================================================
// SENTINEL ERRORS — stable English identifiers for errors.Is() matching.
// User-facing messages are resolved by the i18n translator at the HTTP edge.
// =============================================================================

var (
	ErrSeatsNotAvailable         = errors.New("seats not available")
	ErrSeatsBeingBooked          = errors.New("seats being booked")
	ErrTripLocked                = errors.New("trip locked")
	ErrConcurrentModification    = errors.New("concurrent modification")
	ErrBookingNotFound           = errors.New("booking not found")
	ErrBookingExpired            = errors.New("booking expired")
	ErrInvalidSeatCode           = errors.New("invalid seat code")
	ErrTripNotBookable           = errors.New("trip not bookable")
	ErrInvalidGuestInfo          = errors.New("invalid guest info")
	ErrBookingCannotCancel       = errors.New("booking cannot cancel")
	ErrTooManySeats              = errors.New("too many seats")
	ErrSeatsNotConsecutive       = errors.New("seats not consecutive")
	ErrPaymentNotFound           = errors.New("payment not found")
	ErrPaymentAlreadyDone        = errors.New("payment already processed")
	ErrBookingNotPending         = errors.New("booking not pending")
	ErrRefundWindowExpired       = errors.New("refund window expired")
	ErrBookingNotPaid            = errors.New("booking not paid")
	ErrBookingNotRefundPending   = errors.New("booking not refund pending")
	ErrRefundAlreadyProcessed    = errors.New("refund already processed")
	ErrRefundReferenceRequired   = errors.New("refund reference required")
	ErrInvalidRefundReference    = errors.New("invalid refund reference")
	ErrPaymentLinkUnavailable    = errors.New("payment link unavailable")
	ErrRefundConfirmCodeMismatch = errors.New("refund confirm code mismatch")
	ErrInvalidStatusTransition   = errors.New("invalid booking status transition")
)

// =============================================================================
// VALUE OBJECTS
// =============================================================================

type BookingCode string

func (c BookingCode) String() string {
	return string(c)
}

type BookingStatus string

const (
	StatusPending       BookingStatus = "pending"
	StatusPaid          BookingStatus = "paid"
	StatusCancelled     BookingStatus = "cancelled"
	StatusExpired       BookingStatus = "expired"
	StatusRefundPending BookingStatus = "refund_pending"
	StatusRefunded      BookingStatus = "refunded"
)

func (s BookingStatus) IsValid() bool {
	switch s {
	case StatusPending, StatusPaid, StatusCancelled, StatusExpired, StatusRefundPending, StatusRefunded:
		return true
	}
	return false
}

func (s BookingStatus) String() string {
	return string(s)
}

// =============================================================================
// CORE ENTITY
// =============================================================================

type Booking struct {
	ID              int64
	Code            BookingCode
	TripID          int64
	UserID          *int64 // Nullable cho khách vãng lai
	GuestInfo       GuestInfo
	PickupInfo      PointInfo
	DropoffInfo     PointInfo
	SeatCodes       []string
	TotalAmount     float64
	Status          BookingStatus
	PaymentMethod   string
	ExpiresAt       time.Time
	RefundedAt      time.Time
	RefundReference string
	RefundNote      string
	CreatedAt       time.Time
	UpdatedAt       time.Time

	// Joined fields (for list results)
	DepartureTime   time.Time
	ArrivalTime     time.Time
	OriginName      string
	DestinationName string
	OrderCode       string
}

type GuestInfo struct {
	Name  string `json:"name"`
	Phone string `json:"phone"`
	Email string `json:"email,omitempty"`
}

type PointInfo struct {
	Name      string  `json:"name"`
	Time      string  `json:"time,omitempty"`
	Surcharge float64 `json:"surcharge,omitempty"`
}

// PaymentTransaction tracks payment lifecycle
type PaymentTransaction struct {
	ID            string
	BookingID     int64
	OrderCode     string
	Amount        float64
	Status        string
	PaymentMethod string
	CheckoutURL   string
	QRCode        string
	WebhookData   []byte
	CreatedAt     time.Time
	PaidAt        time.Time
	RefundedAt    time.Time
}

// TripSnapshot - read-only trip data for booking validation
type TripSnapshot struct {
	ID             int64
	ProviderID     int32
	BookedSeats    []string
	AvailableSeats int32
	BasePrice      float64
	PriceModifier  float64
	Version        int32
	Status         string
}

// =============================================================================
// VALIDATION METHODS
// =============================================================================

// RefundWindow is the maximum time after booking creation within which a refund is allowed.
const RefundWindow = 5 * time.Minute

const MaxSeatsPerBooking = 4

func (b *Booking) Validate() error {
	if len(b.SeatCodes) == 0 {
		return ErrInvalidSeatCode
	}
	if b.GuestInfo.Name == "" || b.GuestInfo.Phone == "" {
		return ErrInvalidGuestInfo
	}
	return nil
}

func (b *Booking) CanBeCancelled() bool {
	return b.Status == StatusPending
}

// CanRequestRefund checks if the booking is eligible for a refund request.
// Conditions: status must be 'paid' and within the refund window since payment.
// We use UpdatedAt because MarkBookingPaid sets updated_at = NOW().
func (b *Booking) CanRequestRefund() bool {
	return b.Status == StatusPaid && time.Since(b.UpdatedAt) <= RefundWindow
}

// IsRefundPending checks if the booking is waiting for admin approval.
func (b *Booking) IsRefundPending() bool {
	return b.Status == StatusRefundPending
}

func (b *Booking) IsExpired() bool {
	return b.Status == StatusPending && time.Now().After(b.ExpiresAt)
}

// =============================================================================
// SEAT VALIDATION
// =============================================================================

// seatPattern matches seat codes like "A01", "B12", "C3".
// Prefix = letters, Suffix = digits.
var seatPattern = regexp.MustCompile(`^([A-Za-z]+)(\d+)$`)

// ValidateConsecutiveSeats validates:
// 1. Max 4 seats per booking
// 2. All seats share the same row number (e.g. A01, B01, C01 — same physical row)
// Single seat bookings always pass the check.
func ValidateConsecutiveSeats(seatCodes []string) error {
	if len(seatCodes) > MaxSeatsPerBooking {
		return fmt.Errorf("%w: maximum %d seats allowed, got %d", ErrTooManySeats, MaxSeatsPerBooking, len(seatCodes))
	}

	// Single seat is always valid
	if len(seatCodes) <= 1 {
		return nil
	}

	// Parse all seat codes
	numbers := make([]int, 0, len(seatCodes))
	prefixes := make([]string, 0, len(seatCodes))
	for _, code := range seatCodes {
		matches := seatPattern.FindStringSubmatch(code)
		if matches == nil {
			return fmt.Errorf("%w: %s", ErrInvalidSeatCode, code)
		}
		prefixes = append(prefixes, strings.ToUpper(matches[1]))
		num, _ := strconv.Atoi(matches[2])
		numbers = append(numbers, num)
	}

	// All seats must share the same row number (horizontal booking)
	baseNumber := numbers[0]
	for _, n := range numbers[1:] {
		if n != baseNumber {
			return fmt.Errorf("%w: seats must be in the same row", ErrSeatsNotConsecutive)
		}
	}

	// Seat columns must be adjacent (A,B,C...) without gaps.
	sort.Strings(prefixes)
	for i := 1; i < len(prefixes); i++ {
		if prefixes[i] == prefixes[i-1] {
			return fmt.Errorf("%w: duplicated seat column", ErrInvalidSeatCode)
		}
		prev := []rune(prefixes[i-1])
		curr := []rune(prefixes[i])
		if len(prev) != 1 || len(curr) != 1 || curr[0]-prev[0] != 1 {
			return fmt.Errorf("%w: seats must be adjacent", ErrSeatsNotConsecutive)
		}
	}

	return nil
}

// =============================================================================
// BUSINESS LOGIC HELPERS
// =============================================================================

// SeatsAvailable checks if requested seats are not in bookedSeats
func SeatsAvailable(bookedSeats, requestedSeats []string) bool {
	bookedMap := make(map[string]bool)
	for _, seat := range bookedSeats {
		bookedMap[normalizeSeatCode(seat)] = true
	}
	for _, seat := range requestedSeats {
		if bookedMap[normalizeSeatCode(seat)] {
			return false
		}
	}
	return true
}

func normalizeSeatCode(code string) string {
	matches := seatPattern.FindStringSubmatch(strings.TrimSpace(strings.ToUpper(code)))
	if matches == nil {
		return strings.TrimSpace(strings.ToUpper(code))
	}
	num, err := strconv.Atoi(matches[2])
	if err != nil {
		return strings.TrimSpace(strings.ToUpper(code))
	}
	return fmt.Sprintf("%s%02d", strings.ToUpper(matches[1]), num)
}

// CalculatePrice calculates total price for seats
func CalculatePrice(basePrice, priceModifier float64, seatCount int) float64 {
	return basePrice * priceModifier * float64(seatCount)
}
