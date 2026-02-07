package domain

import (
	"errors"
	"time"
)

// =============================================================================
// SENTINEL ERRORS - Cho phép errors.Is() hoạt động
// =============================================================================

var (
	ErrSeatsNotAvailable      = errors.New("Ghế đã được đặt")
	ErrSeatsBeingBooked       = errors.New("Ghế đang được người khác đặt")
	ErrTripLocked             = errors.New("Chuyến xe đang bận, vui lòng thử lại")
	ErrConcurrentModification = errors.New("Dữ liệu đã thay đổi, vui lòng thử lại")
	ErrBookingNotFound        = errors.New("Không tìm thấy đơn đặt vé")
	ErrBookingExpired         = errors.New("Đơn đặt vé đã hết hạn")
	ErrInvalidSeatCode        = errors.New("Mã ghế không hợp lệ")
	ErrTripNotBookable        = errors.New("Chuyến xe không thể đặt vé")
	ErrInvalidGuestInfo       = errors.New("Thông tin khách hàng không hợp lệ")
	ErrBookingCannotCancel    = errors.New("Không thể hủy đơn đặt vé này")
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
