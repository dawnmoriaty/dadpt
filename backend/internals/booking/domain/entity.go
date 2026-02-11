package domain

import (
	"errors"
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"time"
)

// =============================================================================
// SENTINEL ERRORS — stable English identifiers for errors.Is() matching.
// User-facing messages are resolved by the i18n translator at the HTTP edge.
// =============================================================================

var (
	ErrSeatsNotAvailable      = errors.New("seats not available")
	ErrSeatsBeingBooked       = errors.New("seats being booked")
	ErrTripLocked             = errors.New("trip locked")
	ErrConcurrentModification = errors.New("concurrent modification")
	ErrBookingNotFound        = errors.New("booking not found")
	ErrBookingExpired         = errors.New("booking expired")
	ErrInvalidSeatCode        = errors.New("invalid seat code")
	ErrTripNotBookable        = errors.New("trip not bookable")
	ErrInvalidGuestInfo       = errors.New("invalid guest info")
	ErrBookingCannotCancel    = errors.New("booking cannot cancel")
	ErrTooManySeats           = errors.New("too many seats")
	ErrSeatsNotConsecutive    = errors.New("seats not consecutive")
	ErrPaymentNotFound        = errors.New("payment not found")
	ErrPaymentAlreadyDone     = errors.New("payment already processed")
	ErrBookingNotPending      = errors.New("booking not pending")
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
	StatusPending   BookingStatus = "pending"
	StatusPaid      BookingStatus = "paid"
	StatusCancelled BookingStatus = "cancelled"
	StatusExpired   BookingStatus = "expired"
)

func (s BookingStatus) IsValid() bool {
	switch s {
	case StatusPending, StatusPaid, StatusCancelled, StatusExpired:
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
	ID            int64
	Code          BookingCode
	TripID        int64
	UserID        *int64 // Nullable cho khách vãng lai
	GuestInfo     GuestInfo
	PickupInfo    PointInfo
	DropoffInfo   PointInfo
	SeatCodes     []string
	TotalAmount   float64
	Status        BookingStatus
	PaymentMethod string
	ExpiresAt     time.Time
	CreatedAt     time.Time
	UpdatedAt     time.Time

	// Joined fields (for list results)
	DepartureTime   time.Time
	ArrivalTime     time.Time
	OriginName      string
	DestinationName string
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
	WebhookData   []byte
	CreatedAt     time.Time
	PaidAt        time.Time
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
// 2. All seats share the same row prefix (e.g. all "A")
// 3. Seat numbers are consecutive (e.g. 1,2,3)
// Single seat bookings always pass the consecutive check.
func ValidateConsecutiveSeats(seatCodes []string) error {
	if len(seatCodes) > MaxSeatsPerBooking {
		return fmt.Errorf("%w: maximum %d seats allowed, got %d", ErrTooManySeats, MaxSeatsPerBooking, len(seatCodes))
	}

	// Single seat is always valid
	if len(seatCodes) <= 1 {
		return nil
	}

	type parsed struct {
		prefix string
		number int
	}

	seats := make([]parsed, 0, len(seatCodes))
	for _, code := range seatCodes {
		matches := seatPattern.FindStringSubmatch(code)
		if matches == nil {
			return fmt.Errorf("%w: %s", ErrInvalidSeatCode, code)
		}
		num, _ := strconv.Atoi(matches[2])
		seats = append(seats, parsed{prefix: matches[1], number: num})
	}

	// All seats must share the same row prefix
	basePrefix := seats[0].prefix
	for _, s := range seats[1:] {
		if s.prefix != basePrefix {
			return fmt.Errorf("%w: seats must be in the same row", ErrSeatsNotConsecutive)
		}
	}

	// Sort by number and check consecutive
	sort.Slice(seats, func(i, j int) bool { return seats[i].number < seats[j].number })
	for i := 1; i < len(seats); i++ {
		if seats[i].number != seats[i-1].number+1 {
			return fmt.Errorf("%w: seat numbers must be consecutive", ErrSeatsNotConsecutive)
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
		bookedMap[seat] = true
	}
	for _, seat := range requestedSeats {
		if bookedMap[seat] {
			return false
		}
	}
	return true
}

// CalculatePrice calculates total price for seats
func CalculatePrice(basePrice, priceModifier float64, seatCount int) float64 {
	return basePrice * priceModifier * float64(seatCount)
}
