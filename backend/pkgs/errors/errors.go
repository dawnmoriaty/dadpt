package errors

import (
	"fmt"
	"net/http"
)

type ErrorCode string

const (
	// Generic
	ErrCodeInternal     ErrorCode = "INTERNAL_ERROR"
	ErrCodeBadRequest   ErrorCode = "BAD_REQUEST"
	ErrCodeNotFound     ErrorCode = "NOT_FOUND"
	ErrCodeUnauthorized ErrorCode = "UNAUTHORIZED"
	ErrCodeForbidden    ErrorCode = "FORBIDDEN"
	ErrCodeConflict     ErrorCode = "CONFLICT"
	ErrCodeValidation   ErrorCode = "VALIDATION_ERROR"

	// Validation codes
	ErrCodeInvalidID         ErrorCode = "INVALID_ID"
	ErrCodeMissingAuthHeader ErrorCode = "MISSING_AUTH_HEADER"
	ErrCodeInsufficientRole  ErrorCode = "INSUFFICIENT_ROLE"
	ErrCodeRequiredField     ErrorCode = "REQUIRED_FIELD"

	// Auth
	ErrCodeInvalidCredentials ErrorCode = "INVALID_CREDENTIALS"
	ErrCodeInvalidToken       ErrorCode = "INVALID_TOKEN"
	ErrCodePhoneExists        ErrorCode = "PHONE_EXISTS"

	// Location
	ErrCodeLocationNotFound ErrorCode = "LOCATION_NOT_FOUND"
	ErrCodeLocationInUse    ErrorCode = "LOCATION_IN_USE"

	// Trip
	ErrCodeTripNotFound        ErrorCode = "TRIP_NOT_FOUND"
	ErrCodeTripAlreadyDeparted ErrorCode = "TRIP_ALREADY_DEPARTED"
	ErrCodeTripNoSeats         ErrorCode = "TRIP_NO_SEATS_AVAILABLE"
	ErrCodeInvalidTripStatus   ErrorCode = "INVALID_TRIP_STATUS"

	// Provider
	ErrCodeProviderNotFound ErrorCode = "PROVIDER_NOT_FOUND"
	ErrCodeProviderInactive ErrorCode = "PROVIDER_INACTIVE"
	ErrCodeDuplicateSlug    ErrorCode = "DUPLICATE_SLUG"
)

type AppError struct {
	Code    ErrorCode `json:"code"`
	Message string    `json:"message"`
	Status  int       `json:"-"`
	Raw     error     `json:"-"`
}

func (e *AppError) Error() string {
	if e.Raw != nil {
		return fmt.Sprintf("[%s] %s: %v", e.Code, e.Message, e.Raw)
	}
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

func NewAppError(status int, code ErrorCode, message string) *AppError {
	return &AppError{
		Status:  status,
		Code:    code,
		Message: message,
	}
}

func Wrap(err error, status int, code ErrorCode, message string) *AppError {
	return &AppError{
		Status:  status,
		Code:    code,
		Message: message,
		Raw:     err,
	}
}

// Pre-defined errors
var (
	ErrInternal           = NewAppError(http.StatusInternalServerError, ErrCodeInternal, "Something went wrong")
	ErrNotFound           = NewAppError(http.StatusNotFound, ErrCodeNotFound, "Resource not found")
	ErrBadRequest         = NewAppError(http.StatusBadRequest, ErrCodeBadRequest, "Bad request")
	ErrUnauthorized       = NewAppError(http.StatusUnauthorized, ErrCodeUnauthorized, "Unauthorized")
	ErrForbidden          = NewAppError(http.StatusForbidden, ErrCodeForbidden, "Forbidden")
	ErrMissingAuthHeader  = NewAppError(http.StatusUnauthorized, ErrCodeMissingAuthHeader, "Missing authorization header")
	ErrInsufficientRole   = NewAppError(http.StatusForbidden, ErrCodeInsufficientRole, "Insufficient permissions")
	ErrInvalidCredentials = NewAppError(http.StatusUnauthorized, ErrCodeInvalidCredentials, "Invalid phone or password")
	ErrInvalidToken       = NewAppError(http.StatusUnauthorized, ErrCodeInvalidToken, "Invalid or expired token")
	ErrPhoneExists        = NewAppError(http.StatusConflict, ErrCodePhoneExists, "Phone number already registered")

	// Location
	ErrLocationNotFound = NewAppError(http.StatusNotFound, ErrCodeLocationNotFound, "Location not found")
	ErrLocationInUse    = NewAppError(http.StatusConflict, ErrCodeLocationInUse, "Location is being used by trips")

	// Trip
	ErrTripNotFound        = NewAppError(http.StatusNotFound, ErrCodeTripNotFound, "Trip not found")
	ErrTripAlreadyDeparted = NewAppError(http.StatusBadRequest, ErrCodeTripAlreadyDeparted, "Trip has already departed")
	ErrTripNoSeats         = NewAppError(http.StatusBadRequest, ErrCodeTripNoSeats, "No seats available")
	ErrInvalidTripStatus   = NewAppError(http.StatusBadRequest, ErrCodeInvalidTripStatus, "Invalid trip status transition")

	// Provider
	ErrProviderNotFound = NewAppError(http.StatusNotFound, ErrCodeProviderNotFound, "Provider not found")
	ErrProviderInactive = NewAppError(http.StatusBadRequest, ErrCodeProviderInactive, "Provider is inactive")
	ErrDuplicateSlug    = NewAppError(http.StatusConflict, ErrCodeDuplicateSlug, "Slug already exists")
)

// Validation error factories
func ValidationError(msg string) *AppError {
	return NewAppError(http.StatusBadRequest, ErrCodeValidation, msg)
}

func InvalidID(entity string) *AppError {
	return NewAppError(http.StatusBadRequest, ErrCodeInvalidID, fmt.Sprintf("Invalid %s ID", entity))
}

func RequiredField(field string) *AppError {
	return NewAppError(http.StatusBadRequest, ErrCodeRequiredField, fmt.Sprintf("%s is required", field))
}
