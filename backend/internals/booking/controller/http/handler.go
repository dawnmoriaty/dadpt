package http

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/url"
	"strings"

	"backend/internals/booking/controller/dto"
	"backend/internals/booking/domain"
	"backend/internals/booking/infrastructure"
	"backend/internals/booking/usecase"
	pkgErrors "backend/pkgs/errors"
	"backend/pkgs/messaging"
	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
)

type BookingHandler struct {
	uc     usecase.IBookingUseCase
	sseHub *infrastructure.SSEHub
}

// NewBookingHandler creates a new booking handler
func NewBookingHandler(uc usecase.IBookingUseCase, sseHub *infrastructure.SSEHub) *BookingHandler {
	return &BookingHandler{uc: uc, sseHub: sseHub}
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

	ctx := usecase.WithClientBaseURL(c.Request.Context(), resolveClientBaseURL(c))
	result, err := h.uc.CreateBooking(ctx, req.ToInput(userID))
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

	response.Success(c, dto.ToCreateBookingResponse(h.buildBookingViewOutput(c, booking)))
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
		UserID:   userID.(int64),
		Limit:    req.Limit,
		Offset:   req.Offset,
		Page:     req.Page,
		PageSize: req.PageSize,
	})
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	for _, booking := range result.Bookings {
		if booking == nil {
			continue
		}
		paymentTx, txErr := h.uc.GetLatestPaymentByBookingID(c.Request.Context(), booking.ID)
		if txErr != nil || paymentTx == nil {
			continue
		}
		booking.OrderCode = paymentTx.OrderCode
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

// StreamMyEvents GET /bookings/events (SSE endpoint)
func (h *BookingHandler) StreamMyEvents(c *gin.Context) {
	if h.sseHub == nil {
		response.HandleError(c, pkgErrors.Wrap(errors.New("sse unavailable"), 500, pkgErrors.ErrCodeInternal))
		return
	}

	userIDRaw, exists := c.Get("userID")
	if !exists {
		response.HandleError(c, pkgErrors.ErrUnauthorized)
		return
	}

	userID, ok := userIDRaw.(int64)
	if !ok {
		response.HandleError(c, pkgErrors.ErrUnauthorized)
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")

	clientCh := make(chan []byte, 20)
	h.sseHub.Register(clientCh)
	defer h.sseHub.Unregister(clientCh)

	c.SSEvent("connected", `{"message":"connected"}`)
	c.Writer.Flush()

	ctx := c.Request.Context()
	c.Stream(func(w io.Writer) bool {
		select {
		case <-ctx.Done():
			return false
		case data, ok := <-clientCh:
			if !ok {
				return false
			}

			targetUserID, hasUserID := parseEventUserID(data)
			if !hasUserID || targetUserID != userID {
				return true
			}

			c.SSEvent(getBookingSSEEventName(data), string(data))
			c.Writer.Flush()
			fmt.Fprint(w, "")
			return true
		}
	})
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
	case errors.Is(err, domain.ErrTooManySeats):
		return pkgErrors.ErrTooManySeats
	case errors.Is(err, domain.ErrSeatsNotConsecutive):
		return pkgErrors.ErrSeatsNotConsecutive
	case errors.Is(err, domain.ErrBookingNotPending):
		return pkgErrors.ErrBookingNotPending
	case errors.Is(err, domain.ErrRefundWindowExpired):
		return pkgErrors.ErrRefundWindowExpired
	case errors.Is(err, domain.ErrBookingNotPaid):
		return pkgErrors.ErrBookingNotPaid
	case errors.Is(err, domain.ErrBookingNotRefundPending):
		return pkgErrors.ErrBookingNotRefundPending
	case errors.Is(err, domain.ErrRefundAlreadyProcessed):
		return pkgErrors.ErrRefundAlreadyProcessed
	case errors.Is(err, domain.ErrRefundReferenceRequired):
		return pkgErrors.ValidationError("refund reference is required")
	case errors.Is(err, domain.ErrInvalidRefundReference):
		return pkgErrors.ValidationError("invalid refund reference")
	case errors.Is(err, domain.ErrRefundConfirmCodeMismatch):
		return pkgErrors.ValidationError("confirm code does not match booking code")
	case errors.Is(err, domain.ErrInvalidStatusTransition):
		return pkgErrors.ValidationError("invalid booking status transition")
	default:
		return pkgErrors.Wrap(err, 500, pkgErrors.ErrCodeInternal)
	}
}

func parseEventUserID(data []byte) (int64, bool) {
	var envelope messaging.EventEnvelope
	if err := json.Unmarshal(data, &envelope); err != nil {
		return 0, false
	}

	var payload domain.BookingEventPayload
	if err := json.Unmarshal(envelope.Payload, &payload); err != nil {
		return 0, false
	}

	if payload.UserID == nil {
		return 0, false
	}

	return *payload.UserID, true
}

func getBookingSSEEventName(data []byte) string {
	var envelope messaging.EventEnvelope
	if err := json.Unmarshal(data, &envelope); err != nil {
		return "booking_event"
	}

	switch envelope.EventType {
	case usecase.TopicBookingPaid:
		return "booking_paid"
	case usecase.TopicBookingCancelled:
		return "booking_cancelled"
	case usecase.TopicBookingRefundRequested:
		return "refund_requested"
	case usecase.TopicBookingRefundApproved:
		return "refund_approved"
	case usecase.TopicBookingRefundRejected:
		return "refund_rejected"
	case usecase.TopicBookingExpired:
		return "booking_expired"
	default:
		return "booking_event"
	}
}

func resolveClientBaseURL(c *gin.Context) string {
	origin := strings.TrimSpace(c.GetHeader("Origin"))
	if origin != "" {
		return strings.TrimRight(origin, "/")
	}

	referer := strings.TrimSpace(c.GetHeader("Referer"))
	if referer != "" {
		if idx := strings.Index(referer, "://"); idx > -1 {
			start := idx + 3
			end := strings.Index(referer[start:], "/")
			if end > -1 {
				return referer[:start+end]
			}
			return strings.TrimRight(referer, "/")
		}
	}

	return ""
}

func (h *BookingHandler) buildBookingViewOutput(c *gin.Context, booking *domain.Booking) *domain.BookingOutput {
	output := &domain.BookingOutput{Booking: booking}
	if booking == nil {
		return output
	}

	paymentTx, err := h.uc.GetLatestPaymentByBookingID(c.Request.Context(), booking.ID)
	if err != nil || paymentTx == nil {
		return output
	}

	output.OrderCode = paymentTx.OrderCode

	if booking.Status != domain.StatusPending {
		return output
	}

	output.ResumeURL = buildPaymentResumeURL(resolveClientBaseURL(c), booking.Code, paymentTx.OrderCode)
	output.PaymentURL = strings.TrimSpace(paymentTx.CheckoutURL)
	output.QRCode = strings.TrimSpace(paymentTx.QRCode)

	if h.uc.GatewayAvailable() {
		resume, err := h.uc.RegeneratePaymentLink(c.Request.Context(), booking, paymentTx)
		if err == nil && resume != nil {
			if strings.TrimSpace(resume.PaymentURL) != "" {
				output.PaymentURL = strings.TrimSpace(resume.PaymentURL)
			}
			if strings.TrimSpace(resume.QRCode) != "" {
				output.QRCode = strings.TrimSpace(resume.QRCode)
			}
		}
	}

	return output
}

func buildPaymentResumeURL(clientBaseURL string, bookingCode domain.BookingCode, orderCode string) string {
	base := strings.TrimRight(strings.TrimSpace(clientBaseURL), "/")
	if base == "" || strings.TrimSpace(orderCode) == "" || strings.TrimSpace(string(bookingCode)) == "" {
		return ""
	}
	v := url.Values{}
	v.Set("orderCode", strings.TrimSpace(orderCode))
	return base + "/payment/" + strings.TrimSpace(string(bookingCode)) + "?" + v.Encode()
}
