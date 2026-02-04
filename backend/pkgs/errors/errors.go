package errors

import (
	"fmt"
	"net/http"
	"runtime"
	"strings"
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
	Stack   string    `json:"-"` // Stack trace for debugging
}

func (e *AppError) Error() string {
	if e.Raw != nil {
		return fmt.Sprintf("[%s] %s: %v", e.Code, e.Message, e.Raw)
	}
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

// Unwrap returns the underlying error for errors.Is/As support
func (e *AppError) Unwrap() error {
	return e.Raw
}

func NewAppError(status int, code ErrorCode, message string) *AppError {
	return &AppError{
		Status:  status,
		Code:    code,
		Message: message,
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

// Wrap wraps an error with additional context and captures stack trace
func Wrap(err error, status int, code ErrorCode, message string) *AppError {
	return &AppError{
		Status:  status,
		Code:    code,
		Message: message,
		Raw:     err,
		Stack:   captureStack(2), // Skip Wrap and captureStack
	}
}

// WrapWithContext wraps an error with additional context message
func WrapWithContext(err error, status int, code ErrorCode, message string, context string) *AppError {
	return &AppError{
		Status:  status,
		Code:    code,
		Message: fmt.Sprintf("%s: %s", message, context),
		Raw:     err,
		Stack:   captureStack(2),
	}
}

// Pre-defined errors
var (
	ErrInternal          = NewAppError(http.StatusInternalServerError, ErrCodeInternal, "Something went wrong")
	ErrNotFound          = NewAppError(http.StatusNotFound, ErrCodeNotFound, "Resource not found")
	ErrBadRequest        = NewAppError(http.StatusBadRequest, ErrCodeBadRequest, "Bad request")
	ErrUnauthorized      = NewAppError(http.StatusUnauthorized, ErrCodeUnauthorized, "Unauthorized")
	ErrForbidden         = NewAppError(http.StatusForbidden, ErrCodeForbidden, "Forbidden")
	ErrMissingAuthHeader = NewAppError(http.StatusUnauthorized, ErrCodeMissingAuthHeader, "Missing authorization header")
	ErrInsufficientRole  = NewAppError(http.StatusForbidden, ErrCodeInsufficientRole, "Insufficient permissions")

	// Auth errors
	ErrInvalidCredentials = NewAppError(http.StatusUnauthorized, ErrCodeInvalidCredentials, "Invalid phone or password")
	ErrInvalidToken       = NewAppError(http.StatusUnauthorized, ErrCodeInvalidToken, "Invalid or expired token")
	ErrTokenExpired       = NewAppError(http.StatusUnauthorized, ErrCodeTokenExpired, "Token has expired")
	ErrPhoneExists        = NewAppError(http.StatusConflict, ErrCodePhoneExists, "Phone number already registered")
	ErrEmailExists        = NewAppError(http.StatusConflict, ErrCodeEmailExists, "Email already registered")
	ErrUserNotFound       = NewAppError(http.StatusNotFound, ErrCodeUserNotFound, "User not found")
	ErrUserInactive       = NewAppError(http.StatusForbidden, ErrCodeUserInactive, "User account is inactive")
	ErrInvalidPhone       = NewAppError(http.StatusBadRequest, ErrCodeInvalidPhone, "Invalid phone format: must be Vietnamese phone number")
	ErrInvalidEmail       = NewAppError(http.StatusBadRequest, ErrCodeInvalidEmail, "Invalid email format")
	ErrInvalidPassword    = NewAppError(http.StatusBadRequest, ErrCodeInvalidPassword, "Password must be at least 6 characters")
	ErrInvalidFullName    = NewAppError(http.StatusBadRequest, ErrCodeInvalidFullName, "Full name must be at least 2 characters")
	ErrInvalidUsername    = NewAppError(http.StatusBadRequest, ErrCodeInvalidUsername, "Username must be 3-30 alphanumeric characters or underscore")

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
