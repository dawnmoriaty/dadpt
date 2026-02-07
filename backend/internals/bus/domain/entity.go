package domain

import "errors"

// Sentinel errors
var (
	ErrBusNotFound             = errors.New("Không tìm thấy xe buýt")
	ErrBusProviderIDRequired   = errors.New("Nhà cung cấp là bắt buộc")
	ErrBusBusTypeIDRequired    = errors.New("Loại xe là bắt buộc")
	ErrBusLicensePlateRequired = errors.New("Biển số xe là bắt buộc")
	ErrBusLicensePlateTooShort = errors.New("Biển số xe quá ngắn (tối thiểu 5 ký tự)")
	ErrBusStatusInvalid        = errors.New("Trạng thái xe không hợp lệ")
)

// Bus represents a specific bus vehicle
type Bus struct {
	ID           int32
	ProviderID   int32
	BusTypeID    int32
	LicensePlate string
	Status       string // active, maintenance, retired
	ImageURL     string

	// Joined fields
	BusTypeName  string
	TotalSeats   int32
	ProviderName string
}

// Validate validates the bus entity
func (b *Bus) Validate() error {
	if b.ProviderID <= 0 {
		return ErrBusProviderIDRequired
	}
	if b.BusTypeID <= 0 {
		return ErrBusBusTypeIDRequired
	}
	if b.LicensePlate == "" {
		return ErrBusLicensePlateRequired
	}
	if len(b.LicensePlate) < 5 {
		return ErrBusLicensePlateTooShort
	}
	return nil
}
