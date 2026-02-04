package domain

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

// BusFilter for listing/searching buses
type BusFilter struct {
	ProviderID int32
	Limit      int32
	Offset     int32
}

// Validation error constants
var (
	ErrBusProviderIDRequired   = "BUS_PROVIDER_ID_REQUIRED"
	ErrBusBusTypeIDRequired    = "BUS_BUS_TYPE_ID_REQUIRED"
	ErrBusLicensePlateRequired = "BUS_LICENSE_PLATE_REQUIRED"
	ErrBusLicensePlateTooShort = "BUS_LICENSE_PLATE_TOO_SHORT(MIN = 5)"
)

// Validate validates the bus
func (b *Bus) Validate() []string {
	var errs []string

	if b.ProviderID <= 0 {
		errs = append(errs, ErrBusProviderIDRequired)
	}

	if b.BusTypeID <= 0 {
		errs = append(errs, ErrBusBusTypeIDRequired)
	}

	if b.LicensePlate == "" {
		errs = append(errs, ErrBusLicensePlateRequired)
	} else if len(b.LicensePlate) < 5 {
		errs = append(errs, ErrBusLicensePlateTooShort)
	}

	return errs
}
