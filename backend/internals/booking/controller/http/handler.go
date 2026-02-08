package http

import (
	"errors"
	"fmt"

	"backend/internals/booking/controller/dto"
	"backend/internals/booking/domain"
	"backend/internals/booking/usecase"
	pkgErrors "backend/pkgs/errors"
	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
)

type BookingHandler struct {
	uc usecase.IBookingUseCase
}

// NewBookingHandler creates a new booking handler
func NewBookingHandler(uc usecase.IBookingUseCase) *BookingHandler {
	return &BookingHandler{uc: uc}
}

// CreateBooking POST /bookings
func (h *BookingHandler) CreateBooking(c *gin.Context) {
	var req dto.CreateBookingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
		return
	}

	// Get user ID from context (set by auth middleware, nullable for guest)
	var userID *int64
	if id, exists := c.Get("userID"); exists {
		uid := id.(int64)
		userID = &uid
	}

	result, err := h.uc.CreateBooking(c.Request.Context(), req.ToInput(userID))
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Created(c, dto.ToCreateBookingResponse(result))
}

// GetBooking GET /bookings/:id
func (h *BookingHandler) GetBooking(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		response.HandleError(c, pkgErrors.ValidationError("invalid booking id"))
		return
	}

	booking, err := h.uc.GetBooking(c.Request.Context(), id)
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToBookingResponse(booking))
}

// GetBookingByCode GET /bookings/code/:code
func (h *BookingHandler) GetBookingByCode(c *gin.Context) {
	code := c.Param("code")
	if code == "" {
		response.HandleError(c, pkgErrors.ValidationError("booking code is required"))
		return
	}

	booking, err := h.uc.GetBookingByCode(c.Request.Context(), code)
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToBookingResponse(booking))
}

// ListUserBookings GET /bookings/my
func (h *BookingHandler) ListUserBookings(c *gin.Context) {
	var req dto.ListBookingsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
		return
	}

	// Get user ID from context (required for this endpoint)
	userID, exists := c.Get("userID")
	if !exists {
		response.HandleError(c, pkgErrors.ErrUnauthorized)
		return
	}

	result, err := h.uc.ListUserBookings(c.Request.Context(), &domain.ListBookingsInput{
		UserID: userID.(int64),
		Limit:  req.Limit,
		Offset: req.Offset,
	})
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToBookingListResponse(result))
}

// CancelBooking POST /bookings/:id/cancel
func (h *BookingHandler) CancelBooking(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		response.HandleError(c, pkgErrors.ValidationError("invalid booking id"))
		return
	}

	// Get user ID from context (optional)
	var userID *int64
	if id, exists := c.Get("userID"); exists {
		uid := id.(int64)
		userID = &uid
	}

	booking, err := h.uc.CancelBooking(c.Request.Context(), &domain.CancelBookingInput{
		BookingID: id,
		UserID:    userID,
	})
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToBookingResponse(booking))
}

// =============================================================================
// HELPERS
// =============================================================================

func parseID(c *gin.Context, param string) (int64, error) {
	var id int64
	if _, err := parseIntParam(c.Param(param), &id); err != nil {
		return 0, err
	}
	return id, nil
}

func parseIntParam(s string, v *int64) (bool, error) {
	if s == "" {
		return false, nil
	}
	var n int64
	_, err := fmt.Sscanf(s, "%d", &n)
	if err != nil {
		return false, err
	}
	*v = n
	return true, nil
}

// =============================================================================
// ERROR MAPPING - Convert domain errors to pkgs/errors.AppError
// =============================================================================

func mapDomainError(err error) error {
	switch {
	case errors.Is(err, domain.ErrSeatsNotAvailable):
		return pkgErrors.ErrSeatsNotAvailable
	case errors.Is(err, domain.ErrSeatsBeingBooked):
		return pkgErrors.ErrSeatsBeingBooked
	case errors.Is(err, domain.ErrConcurrentModification):
		return pkgErrors.ErrConcurrentModification
	case errors.Is(err, domain.ErrTripLocked):
		return pkgErrors.ErrTripLocked
	case errors.Is(err, domain.ErrInvalidSeatCode):
		return pkgErrors.ErrInvalidSeatCode
	case errors.Is(err, domain.ErrInvalidGuestInfo):
		return pkgErrors.ErrInvalidGuestInfo
	case errors.Is(err, domain.ErrTripNotBookable):
		return pkgErrors.ErrTripNotBookable
	case errors.Is(err, domain.ErrBookingCannotCancel):
		return pkgErrors.ErrBookingCannotCancel
	case errors.Is(err, domain.ErrBookingExpired):
		return pkgErrors.ErrBookingExpired
	case errors.Is(err, domain.ErrBookingNotFound):
		return pkgErrors.ErrBookingNotFound
	default:
		return pkgErrors.Wrap(err, 500, pkgErrors.ErrCodeInternal)
	}
}
