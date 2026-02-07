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
	ErrInvalidCredentials = NewAppError(http.StatusUnauthorized, ErrCodeInvalidCredentials, "Số điện thoại hoặc mật khẩu không hợp lệ")
	ErrInvalidToken       = NewAppError(http.StatusUnauthorized, ErrCodeInvalidToken, "Token không hợp lệ")
	ErrTokenExpired       = NewAppError(http.StatusUnauthorized, ErrCodeTokenExpired, "Token hết hạn")
	ErrPhoneExists        = NewAppError(http.StatusConflict, ErrCodePhoneExists, "Số điện thoại đã được đăng ký")
	ErrEmailExists        = NewAppError(http.StatusConflict, ErrCodeEmailExists, "Email đã được đăng ký")
	ErrUserNotFound       = NewAppError(http.StatusNotFound, ErrCodeUserNotFound, "Người dùng không tồn tại")
	ErrUserInactive       = NewAppError(http.StatusForbidden, ErrCodeUserInactive, "Tài khoản người dùng không hoạt động")
	ErrInvalidPhone       = NewAppError(http.StatusBadRequest, ErrCodeInvalidPhone, "Định dạng số điện thoại không hợp lệ: phải là số điện thoại Việt Nam")
	ErrInvalidEmail       = NewAppError(http.StatusBadRequest, ErrCodeInvalidEmail, "Định dạng email không hợp lệ")
	ErrInvalidPassword    = NewAppError(http.StatusBadRequest, ErrCodeInvalidPassword, "Mật khẩu phải có ít nhất 6 ký tự")
	ErrInvalidFullName    = NewAppError(http.StatusBadRequest, ErrCodeInvalidFullName, "Họ tên phải có ít nhất 2 ký tự")
	ErrInvalidUsername    = NewAppError(http.StatusBadRequest, ErrCodeInvalidUsername, "Tên người dùng phải có 3-30 ký tự chữ, số hoặc dấu gạch dưới")

	// Location
	ErrLocationNotFound = NewAppError(http.StatusNotFound, ErrCodeLocationNotFound, "Không tìm thấy địa điểm")
	ErrLocationInUse    = NewAppError(http.StatusConflict, ErrCodeLocationInUse, "Địa điểm đang được sử dụng bởi các chuyến đi")

	// Trip
	ErrTripNotFound        = NewAppError(http.StatusNotFound, ErrCodeTripNotFound, "Không tìm thấy chuyến đi")
	ErrTripAlreadyDeparted = NewAppError(http.StatusBadRequest, ErrCodeTripAlreadyDeparted, "Chuyến đi đã khởi hành")
	ErrTripNoSeats         = NewAppError(http.StatusBadRequest, ErrCodeTripNoSeats, "Không còn chỗ trống")
	ErrInvalidTripStatus   = NewAppError(http.StatusBadRequest, ErrCodeInvalidTripStatus, "Chuyển trạng thái chuyến đi không hợp lệ")

	// Provider
	ErrProviderNotFound = NewAppError(http.StatusNotFound, ErrCodeProviderNotFound, "Không tìm thấy nhà cung cấp")
	ErrProviderInactive = NewAppError(http.StatusBadRequest, ErrCodeProviderInactive, "Nhà cung cấp không hoạt động")
	ErrDuplicateSlug    = NewAppError(http.StatusConflict, ErrCodeDuplicateSlug, "Slug đã tồn tại")
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
