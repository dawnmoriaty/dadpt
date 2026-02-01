package domain

import "strings"

// Domain validation errors - defined as constants for consistency
var (
	ErrLocationNameRequired = "LOCATION_NAME_REQUIRED"
	ErrLocationNameTooShort = "LOCATION_NAME_TOO_SHORT"
	ErrLocationCityRequired = "LOCATION_CITY_REQUIRED"
	ErrLocationCityTooShort = "LOCATION_CITY_TOO_SHORT"
)

// Location is a pure domain entity representing a bus terminal/station
type Location struct {
	ID       int32
	Name     string
	City     string
	Address  string
	Keywords string
}

// LocationFilter for listing/searching locations
type LocationFilter struct {
	City   string
	Limit  int32
	Offset int32
}

// Validation methods - pure Go logic, return error constants

func (l *Location) ValidateName() (bool, string) {
	name := strings.TrimSpace(l.Name)
	if name == "" {
		return false, ErrLocationNameRequired
	}
	if len(name) < 2 {
		return false, ErrLocationNameTooShort
	}
	return true, ""
}

func (l *Location) ValidateCity() (bool, string) {
	city := strings.TrimSpace(l.City)
	if city == "" {
		return false, ErrLocationCityRequired
	}
	if len(city) < 2 {
		return false, ErrLocationCityTooShort
	}
	return true, ""
}

// Validate runs all validations and returns error codes
func (l *Location) Validate() []string {
	var errs []string
	if valid, code := l.ValidateName(); !valid {
		errs = append(errs, code)
	}
	if valid, code := l.ValidateCity(); !valid {
		errs = append(errs, code)
	}
	return errs
}

// IsComplete checks if location has all required fields
func (l *Location) IsComplete() bool {
	return len(l.Validate()) == 0
}
