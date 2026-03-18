package errors

import (
	"fmt"
	"net/http"
	"runtime"
	"strings"
)

type ErrorCode = string

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
	ErrCodeTokenExpired       ErrorCode = "TOKEN_EXPIRED"
	ErrCodePhoneExists        ErrorCode = "PHONE_EXISTS"
	ErrCodeEmailExists        ErrorCode = "EMAIL_EXISTS"
	ErrCodeUserNotFound       ErrorCode = "USER_NOT_FOUND"
	ErrCodeUserInactive       ErrorCode = "USER_INACTIVE"
	ErrCodeInvalidPhone       ErrorCode = "INVALID_PHONE"
	ErrCodeInvalidEmail       ErrorCode = "INVALID_EMAIL"
	ErrCodeInvalidPassword    ErrorCode = "INVALID_PASSWORD"
	ErrCodeInvalidFullName    ErrorCode = "INVALID_FULL_NAME"
	ErrCodeInvalidUsername    ErrorCode = "INVALID_USERNAME"
	ErrCodeInvalidRole        ErrorCode = "INVALID_ROLE"

	// Location
	ErrCodeLocationNotFound     ErrorCode = "LOCATION_NOT_FOUND"
	ErrCodeLocationInUse        ErrorCode = "LOCATION_IN_USE"
	ErrCodeLocationNameRequired ErrorCode = "LOCATION_NAME_REQUIRED"
	ErrCodeLocationNameTooShort ErrorCode = "LOCATION_NAME_TOO_SHORT"
	ErrCodeLocationCityRequired ErrorCode = "LOCATION_CITY_REQUIRED"
	ErrCodeLocationCityTooShort ErrorCode = "LOCATION_CITY_TOO_SHORT"

	// Trip
	ErrCodeTripNotFound           ErrorCode = "TRIP_NOT_FOUND"
	ErrCodeTripAlreadyDeparted    ErrorCode = "TRIP_ALREADY_DEPARTED"
	ErrCodeTripNoSeats            ErrorCode = "TRIP_NO_SEATS_AVAILABLE"
	ErrCodeInvalidTripStatus      ErrorCode = "INVALID_TRIP_STATUS"
	ErrCodeTripTransitionInvalid  ErrorCode = "TRIP_TRANSITION_INVALID"
	ErrCodeTripDepartureInPast    ErrorCode = "TRIP_DEPARTURE_IN_PAST"
	ErrCodeArrivalBeforeDeparture ErrorCode = "ARRIVAL_BEFORE_DEPARTURE"
	ErrCodeTripProviderRequired   ErrorCode = "TRIP_PROVIDER_REQUIRED"
	ErrCodeTripOriginRequired     ErrorCode = "TRIP_ORIGIN_REQUIRED"
	ErrCodeTripDestRequired       ErrorCode = "TRIP_DESTINATION_REQUIRED"
	ErrCodeTripPriceInvalid       ErrorCode = "TRIP_PRICE_INVALID"
	ErrCodeTripCannotModify       ErrorCode = "TRIP_CANNOT_MODIFY"
	ErrCodeTripCannotDelete       ErrorCode = "TRIP_CANNOT_DELETE"
	ErrCodeTripHasActiveBookings  ErrorCode = "TRIP_HAS_ACTIVE_BOOKINGS"
	ErrCodeInvalidInput           ErrorCode = "INVALID_INPUT"

	// Provider
	ErrCodeProviderNotFound       ErrorCode = "PROVIDER_NOT_FOUND"
	ErrCodeProviderInactive       ErrorCode = "PROVIDER_INACTIVE"
	ErrCodeDuplicateSlug          ErrorCode = "DUPLICATE_SLUG"
	ErrCodeProviderCannotDelete   ErrorCode = "PROVIDER_CANNOT_DELETE"
	ErrCodeProviderNameRequired   ErrorCode = "PROVIDER_NAME_REQUIRED"
	ErrCodeProviderNameTooShort   ErrorCode = "PROVIDER_NAME_TOO_SHORT"
	ErrCodeProviderHotlineInvalid ErrorCode = "PROVIDER_HOTLINE_INVALID"
	ErrCodeProviderSlugInvalid    ErrorCode = "PROVIDER_SLUG_INVALID"
	ErrCodeProviderSlugTooShort   ErrorCode = "PROVIDER_SLUG_TOO_SHORT"
	ErrCodeProviderSlugTooLong    ErrorCode = "PROVIDER_SLUG_TOO_LONG"

	// Bus
	ErrCodeBusNotFound             ErrorCode = "BUS_NOT_FOUND"
	ErrCodeBusProviderRequired     ErrorCode = "BUS_PROVIDER_REQUIRED"
	ErrCodeBusTypeRequired         ErrorCode = "BUS_TYPE_REQUIRED"
	ErrCodeBusLicensePlateRequired ErrorCode = "BUS_LICENSE_PLATE_REQUIRED"
	ErrCodeBusLicensePlateTooShort ErrorCode = "BUS_LICENSE_PLATE_TOO_SHORT"
	ErrCodeBusStatusInvalid        ErrorCode = "BUS_STATUS_INVALID"
	ErrCodeBusLicensePlateExists   ErrorCode = "BUS_LICENSE_PLATE_EXISTS"

	// BusType
	ErrCodeBusTypeNotFound           ErrorCode = "BUS_TYPE_NOT_FOUND"
	ErrCodeBusTypeNameRequired       ErrorCode = "BUS_TYPE_NAME_REQUIRED"
	ErrCodeBusTypeNameTooShort       ErrorCode = "BUS_TYPE_NAME_TOO_SHORT"
	ErrCodeBusTypeTotalSeatsRequired ErrorCode = "BUS_TYPE_TOTAL_SEATS_REQUIRED"
	ErrCodeBusTypeSeatLayoutRequired ErrorCode = "BUS_TYPE_SEAT_LAYOUT_REQUIRED"

	// Booking
	ErrCodeSeatsNotAvailable       ErrorCode = "SEATS_NOT_AVAILABLE"
	ErrCodeSeatsBeingBooked        ErrorCode = "SEATS_BEING_BOOKED"
	ErrCodeConcurrentModification  ErrorCode = "CONCURRENT_MODIFICATION"
	ErrCodeTripLocked              ErrorCode = "TRIP_LOCKED"
	ErrCodeTripNotBookable         ErrorCode = "TRIP_NOT_BOOKABLE"
	ErrCodeBookingCannotCancel     ErrorCode = "BOOKING_CANNOT_CANCEL"
	ErrCodeBookingExpired          ErrorCode = "BOOKING_EXPIRED"
	ErrCodeBookingNotFound         ErrorCode = "BOOKING_NOT_FOUND"
	ErrCodeInvalidSeatCode         ErrorCode = "INVALID_SEAT_CODE"
	ErrCodeInvalidGuestInfo        ErrorCode = "INVALID_GUEST_INFO"
	ErrCodeTooManySeats            ErrorCode = "TOO_MANY_SEATS"
	ErrCodeSeatsNotConsecutive     ErrorCode = "SEATS_NOT_CONSECUTIVE"
	ErrCodeBookingNotPending       ErrorCode = "BOOKING_NOT_PENDING"
	ErrCodeRefundWindowExpired     ErrorCode = "REFUND_WINDOW_EXPIRED"
	ErrCodeBookingNotPaid          ErrorCode = "BOOKING_NOT_PAID"
	ErrCodeBookingNotRefundPending ErrorCode = "BOOKING_NOT_REFUND_PENDING"
	ErrCodeRefundAlreadyProcessed  ErrorCode = "REFUND_ALREADY_PROCESSED"

	// Payment
	ErrCodePaymentNotFound         ErrorCode = "PAYMENT_NOT_FOUND"
	ErrCodePaymentAlreadyProcessed ErrorCode = "PAYMENT_ALREADY_PROCESSED"

	// Upload
	ErrCodeUploadUnavailable ErrorCode = "UPLOAD_UNAVAILABLE"
	ErrCodeInvalidFile       ErrorCode = "INVALID_FILE"
	ErrCodeUploadFailed      ErrorCode = "UPLOAD_FAILED"
	ErrCodeDeleteFailed      ErrorCode = "DELETE_FAILED"
)

// AppError is the standard application error.
// Code is the i18n translation key; message is resolved at the HTTP edge.
type AppError struct {
	Code   ErrorCode `json:"code"`
	Status int       `json:"-"`
	Raw    error     `json:"-"`
	Stack  string    `json:"-"`
}

func (e *AppError) Error() string {
	if e.Raw != nil {
		return fmt.Sprintf("[%s] %v", e.Code, e.Raw)
	}
	return fmt.Sprintf("[%s]", e.Code)
}

// Unwrap returns the underlying error for errors.Is/As support
func (e *AppError) Unwrap() error {
	return e.Raw
}

// NewAppError creates an AppError with status and code only.
// The user-facing message is resolved by the i18n translator at response time.
func NewAppError(status int, code ErrorCode) *AppError {
	return &AppError{
		Status: status,
		Code:   code,
	}
}

// captureStack captures the current stack trace, skipping the given number of frames
func captureStack(skip int) string {
	var lines []string
	for i := skip; i < skip+10; i++ {
		pc, file, line, ok := runtime.Caller(i)
		if !ok {
			break
		}
		fn := runtime.FuncForPC(pc)
		fnName := "unknown"
		if fn != nil {
			fnName = fn.Name()
			if idx := strings.LastIndex(fnName, "/"); idx >= 0 {
				fnName = fnName[idx+1:]
			}
		}
		lines = append(lines, fmt.Sprintf("\tat %s(%s:%d)", fnName, file, line))
	}
	return strings.Join(lines, "\n")
}

// Wrap wraps a raw error with an AppError code and captures stack trace.
func Wrap(err error, status int, code ErrorCode) *AppError {
	return &AppError{
		Status: status,
		Code:   code,
		Raw:    err,
		Stack:  captureStack(2),
	}
}

// Pre-defined errors — status + code only, message resolved by i18n at response time.
var (
	ErrInternal          = NewAppError(http.StatusInternalServerError, ErrCodeInternal)
	ErrNotFound          = NewAppError(http.StatusNotFound, ErrCodeNotFound)
	ErrBadRequest        = NewAppError(http.StatusBadRequest, ErrCodeBadRequest)
	ErrUnauthorized      = NewAppError(http.StatusUnauthorized, ErrCodeUnauthorized)
	ErrForbidden         = NewAppError(http.StatusForbidden, ErrCodeForbidden)
	ErrMissingAuthHeader = NewAppError(http.StatusUnauthorized, ErrCodeMissingAuthHeader)
	ErrInsufficientRole  = NewAppError(http.StatusForbidden, ErrCodeInsufficientRole)

	// Auth errors
	ErrInvalidCredentials = NewAppError(http.StatusUnauthorized, ErrCodeInvalidCredentials)
	ErrInvalidToken       = NewAppError(http.StatusUnauthorized, ErrCodeInvalidToken)
	ErrTokenExpired       = NewAppError(http.StatusUnauthorized, ErrCodeTokenExpired)
	ErrPhoneExists        = NewAppError(http.StatusConflict, ErrCodePhoneExists)
	ErrEmailExists        = NewAppError(http.StatusConflict, ErrCodeEmailExists)
	ErrUserNotFound       = NewAppError(http.StatusNotFound, ErrCodeUserNotFound)
	ErrUserInactive       = NewAppError(http.StatusForbidden, ErrCodeUserInactive)
	ErrInvalidPhone       = NewAppError(http.StatusBadRequest, ErrCodeInvalidPhone)
	ErrInvalidEmail       = NewAppError(http.StatusBadRequest, ErrCodeInvalidEmail)
	ErrInvalidPassword    = NewAppError(http.StatusBadRequest, ErrCodeInvalidPassword)
	ErrInvalidFullName    = NewAppError(http.StatusBadRequest, ErrCodeInvalidFullName)
	ErrInvalidUsername    = NewAppError(http.StatusBadRequest, ErrCodeInvalidUsername)
	ErrInvalidRole        = NewAppError(http.StatusBadRequest, ErrCodeInvalidRole)

	// Location
	ErrLocationNotFound     = NewAppError(http.StatusNotFound, ErrCodeLocationNotFound)
	ErrLocationInUse        = NewAppError(http.StatusConflict, ErrCodeLocationInUse)
	ErrLocationNameRequired = NewAppError(http.StatusBadRequest, ErrCodeLocationNameRequired)
	ErrLocationNameTooShort = NewAppError(http.StatusBadRequest, ErrCodeLocationNameTooShort)
	ErrLocationCityRequired = NewAppError(http.StatusBadRequest, ErrCodeLocationCityRequired)
	ErrLocationCityTooShort = NewAppError(http.StatusBadRequest, ErrCodeLocationCityTooShort)

	// Trip
	ErrTripNotFound           = NewAppError(http.StatusNotFound, ErrCodeTripNotFound)
	ErrTripAlreadyDeparted    = NewAppError(http.StatusBadRequest, ErrCodeTripAlreadyDeparted)
	ErrTripNoSeats            = NewAppError(http.StatusBadRequest, ErrCodeTripNoSeats)
	ErrInvalidTripStatus      = NewAppError(http.StatusBadRequest, ErrCodeInvalidTripStatus)
	ErrTripTransitionInvalid  = NewAppError(http.StatusBadRequest, ErrCodeTripTransitionInvalid)
	ErrTripDepartureInPast    = NewAppError(http.StatusBadRequest, ErrCodeTripDepartureInPast)
	ErrArrivalBeforeDeparture = NewAppError(http.StatusBadRequest, ErrCodeArrivalBeforeDeparture)
	ErrTripProviderRequired   = NewAppError(http.StatusBadRequest, ErrCodeTripProviderRequired)
	ErrTripOriginRequired     = NewAppError(http.StatusBadRequest, ErrCodeTripOriginRequired)
	ErrTripDestRequired       = NewAppError(http.StatusBadRequest, ErrCodeTripDestRequired)
	ErrTripPriceInvalid       = NewAppError(http.StatusBadRequest, ErrCodeTripPriceInvalid)
	ErrTripCannotModify       = NewAppError(http.StatusBadRequest, ErrCodeTripCannotModify)
	ErrTripCannotDelete       = NewAppError(http.StatusBadRequest, ErrCodeTripCannotDelete)
	ErrTripHasActiveBookings  = NewAppError(http.StatusConflict, ErrCodeTripHasActiveBookings)
	ErrInvalidInput           = NewAppError(http.StatusBadRequest, ErrCodeInvalidInput)

	// Provider
	ErrProviderNotFound       = NewAppError(http.StatusNotFound, ErrCodeProviderNotFound)
	ErrProviderInactive       = NewAppError(http.StatusBadRequest, ErrCodeProviderInactive)
	ErrDuplicateSlug          = NewAppError(http.StatusConflict, ErrCodeDuplicateSlug)
	ErrProviderCannotDelete   = NewAppError(http.StatusBadRequest, ErrCodeProviderCannotDelete)
	ErrProviderNameRequired   = NewAppError(http.StatusBadRequest, ErrCodeProviderNameRequired)
	ErrProviderNameTooShort   = NewAppError(http.StatusBadRequest, ErrCodeProviderNameTooShort)
	ErrProviderHotlineInvalid = NewAppError(http.StatusBadRequest, ErrCodeProviderHotlineInvalid)
	ErrProviderSlugInvalid    = NewAppError(http.StatusBadRequest, ErrCodeProviderSlugInvalid)
	ErrProviderSlugTooShort   = NewAppError(http.StatusBadRequest, ErrCodeProviderSlugTooShort)
	ErrProviderSlugTooLong    = NewAppError(http.StatusBadRequest, ErrCodeProviderSlugTooLong)

	// Bus
	ErrBusNotFound             = NewAppError(http.StatusNotFound, ErrCodeBusNotFound)
	ErrBusProviderRequired     = NewAppError(http.StatusBadRequest, ErrCodeBusProviderRequired)
	ErrBusTypeRequired         = NewAppError(http.StatusBadRequest, ErrCodeBusTypeRequired)
	ErrBusLicensePlateRequired = NewAppError(http.StatusBadRequest, ErrCodeBusLicensePlateRequired)
	ErrBusLicensePlateTooShort = NewAppError(http.StatusBadRequest, ErrCodeBusLicensePlateTooShort)
	ErrBusStatusInvalid        = NewAppError(http.StatusBadRequest, ErrCodeBusStatusInvalid)
	ErrBusLicensePlateExists   = NewAppError(http.StatusConflict, ErrCodeBusLicensePlateExists)

	// BusType
	ErrBusTypeNotFound           = NewAppError(http.StatusNotFound, ErrCodeBusTypeNotFound)
	ErrBusTypeNameRequired       = NewAppError(http.StatusBadRequest, ErrCodeBusTypeNameRequired)
	ErrBusTypeNameTooShort       = NewAppError(http.StatusBadRequest, ErrCodeBusTypeNameTooShort)
	ErrBusTypeTotalSeatsRequired = NewAppError(http.StatusBadRequest, ErrCodeBusTypeTotalSeatsRequired)
	ErrBusTypeSeatLayoutRequired = NewAppError(http.StatusBadRequest, ErrCodeBusTypeSeatLayoutRequired)

	// Booking
	ErrSeatsNotAvailable       = NewAppError(http.StatusConflict, ErrCodeSeatsNotAvailable)
	ErrSeatsBeingBooked        = NewAppError(http.StatusConflict, ErrCodeSeatsBeingBooked)
	ErrConcurrentModification  = NewAppError(http.StatusConflict, ErrCodeConcurrentModification)
	ErrTripLocked              = NewAppError(423, ErrCodeTripLocked)
	ErrTripNotBookable         = NewAppError(http.StatusBadRequest, ErrCodeTripNotBookable)
	ErrBookingCannotCancel     = NewAppError(http.StatusBadRequest, ErrCodeBookingCannotCancel)
	ErrBookingExpired          = NewAppError(http.StatusBadRequest, ErrCodeBookingExpired)
	ErrBookingNotFound         = NewAppError(http.StatusNotFound, ErrCodeBookingNotFound)
	ErrInvalidSeatCode         = NewAppError(http.StatusBadRequest, ErrCodeInvalidSeatCode)
	ErrInvalidGuestInfo        = NewAppError(http.StatusBadRequest, ErrCodeInvalidGuestInfo)
	ErrTooManySeats            = NewAppError(http.StatusBadRequest, ErrCodeTooManySeats)
	ErrSeatsNotConsecutive     = NewAppError(http.StatusBadRequest, ErrCodeSeatsNotConsecutive)
	ErrBookingNotPending       = NewAppError(http.StatusBadRequest, ErrCodeBookingNotPending)
	ErrRefundWindowExpired     = NewAppError(http.StatusBadRequest, ErrCodeRefundWindowExpired)
	ErrBookingNotPaid          = NewAppError(http.StatusBadRequest, ErrCodeBookingNotPaid)
	ErrBookingNotRefundPending = NewAppError(http.StatusBadRequest, ErrCodeBookingNotRefundPending)
	ErrRefundAlreadyProcessed  = NewAppError(http.StatusConflict, ErrCodeRefundAlreadyProcessed)

	// Payment
	ErrPaymentNotFound         = NewAppError(http.StatusNotFound, ErrCodePaymentNotFound)
	ErrPaymentAlreadyProcessed = NewAppError(http.StatusConflict, ErrCodePaymentAlreadyProcessed)

	// Upload
	ErrUploadUnavailable = NewAppError(http.StatusInternalServerError, ErrCodeUploadUnavailable)
	ErrInvalidFile       = NewAppError(http.StatusBadRequest, ErrCodeInvalidFile)
	ErrUploadFailed      = NewAppError(http.StatusInternalServerError, ErrCodeUploadFailed)
	ErrDeleteFailed      = NewAppError(http.StatusInternalServerError, ErrCodeDeleteFailed)
)

// Validation error factory — code-based, message resolved by i18n.
func ValidationError(code ErrorCode) *AppError {
	return NewAppError(http.StatusBadRequest, code)
}

// InvalidID returns a validation error for invalid entity ID.
func InvalidID(entity string) *AppError {
	return NewAppError(http.StatusBadRequest, ErrCodeInvalidID)
}

// RequiredField returns a validation error for a required field.
func RequiredField(field string) *AppError {
	return NewAppError(http.StatusBadRequest, ErrCodeRequiredField)
}
