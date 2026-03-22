package http

import (
	"backend/internals/booking/controller/dto"
	"backend/internals/booking/domain"
	"backend/internals/booking/infrastructure"
	"backend/internals/booking/usecase"
	pkgErrors "backend/pkgs/errors"
	"backend/pkgs/response"
	"encoding/json"
	"fmt"
	"io"

	"github.com/gin-gonic/gin"
)

type eventTypeEnvelope struct {
	EventType string `json:"eventType"`
}

// AdminBookingHandler handles admin refund management endpoints.
type AdminBookingHandler struct {
	uc     usecase.IBookingUseCase
	sseHub *infrastructure.SSEHub
}

// NewAdminBookingHandler creates a new admin booking handler.
func NewAdminBookingHandler(uc usecase.IBookingUseCase, sseHub *infrastructure.SSEHub) *AdminBookingHandler {
	return &AdminBookingHandler{uc: uc, sseHub: sseHub}
}

// ListRefundRequests GET /admin/bookings/refund-requests
func (h *AdminBookingHandler) ListRefundRequests(c *gin.Context) {
	var req dto.ListRefundRequestsParams
	if err := c.ShouldBindQuery(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
		return
	}

	result, err := h.uc.ListRefundRequests(c.Request.Context(), &domain.RefundRequestListInput{
		Page:     req.Page,
		PageSize: req.PageSize,
	})
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToRefundRequestListResponse(result))
}

// CountRefundPending GET /admin/bookings/refund-pending-count
func (h *AdminBookingHandler) CountRefundPending(c *gin.Context) {
	count, err := h.uc.CountRefundPending(c.Request.Context())
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, map[string]int64{"count": count})
}

// ApproveRefund POST /admin/bookings/:id/approve-refund
func (h *AdminBookingHandler) ApproveRefund(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		response.HandleError(c, pkgErrors.ValidationError("invalid booking id"))
		return
	}

	var req dto.RefundActionRequest
	// Body is optional for approve
	_ = c.ShouldBindJSON(&req)

	booking, err := h.uc.ApproveRefund(c.Request.Context(), &domain.RefundRequestInput{
		BookingID:       id,
		Reason:          req.Reason,
		RefundReference: req.RefundReference,
		RefundNote:      req.RefundNote,
		ConfirmCode:     req.ConfirmCode,
	})
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToBookingResponse(booking))
}

// RejectRefund POST /admin/bookings/:id/reject-refund
func (h *AdminBookingHandler) RejectRefund(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		response.HandleError(c, pkgErrors.ValidationError("invalid booking id"))
		return
	}

	var req dto.RefundActionRequest
	_ = c.ShouldBindJSON(&req)

	booking, err := h.uc.RejectRefund(c.Request.Context(), &domain.RefundRequestInput{
		BookingID:   id,
		Reason:      req.Reason,
		ConfirmCode: req.ConfirmCode,
	})
	if err != nil {
		response.HandleError(c, mapDomainError(err))
		return
	}

	response.Success(c, dto.ToBookingResponse(booking))
}

// StreamRefundEvents GET /admin/bookings/refund-events (SSE endpoint)
func (h *AdminBookingHandler) StreamRefundEvents(c *gin.Context) {
	if h.sseHub == nil {
		c.JSON(500, gin.H{"error": "SSE not available"})
		return
	}

	// Set SSE headers
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")

	// Register client channel (buffered to avoid blocking)
	clientCh := make(chan []byte, 10)
	h.sseHub.Register(clientCh)
	defer h.sseHub.Unregister(clientCh)

	// Send initial connection event
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
			c.SSEvent(getAdminSSEEventName(data), string(data))
			c.Writer.Flush()
			// Also write a comment as keepalive
			fmt.Fprint(w, "")
			return true
		}
	})
}

func getAdminSSEEventName(data []byte) string {
	var envelope eventTypeEnvelope

	if err := json.Unmarshal(data, &envelope); err != nil {
		return "booking_event"
	}

	switch envelope.EventType {
	case usecase.TopicBookingRefundRequested:
		return "refund_requested"
	case usecase.TopicBookingCancelled:
		return "booking_cancelled"
	case usecase.TopicBookingRefundApproved:
		return "refund_approved"
	case usecase.TopicBookingRefundRejected:
		return "refund_rejected"
	case usecase.TopicBookingStatusUpdated:
		return "booking_status_updated"
	default:
		return "booking_event"
	}
}
