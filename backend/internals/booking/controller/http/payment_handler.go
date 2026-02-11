package http

import (
	"encoding/json"
	"errors"
	"io"

	"backend/internals/booking/domain"
	"backend/internals/booking/usecase"
	pkgErrors "backend/pkgs/errors"
	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
)

// PaymentWebhookRequest represents the mock PayOS webhook payload
type PaymentWebhookRequest struct {
	OrderCode string `json:"orderCode" binding:"required"`
	Status    string `json:"status" binding:"required,oneof=success failed cancelled"`
}

// PaymentWebhookResponse is the response to the webhook
type PaymentWebhookResponse struct {
	Message   string `json:"message"`
	BookingID int64  `json:"bookingId,omitempty"`
	Status    string `json:"status,omitempty"`
}

type PaymentHandler struct {
	uc usecase.IBookingUseCase
}

// NewPaymentHandler creates a new payment handler
func NewPaymentHandler(uc usecase.IBookingUseCase) *PaymentHandler {
	return &PaymentHandler{uc: uc}
}

// HandleWebhook POST /payments/webhook
// Mock PayOS webhook — accepts orderCode + status, confirms or fails the payment.
func (h *PaymentHandler) HandleWebhook(c *gin.Context) {
	var req PaymentWebhookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
		return
	}

	// Read raw body for audit trail
	bodyBytes, _ := io.ReadAll(c.Request.Body)
	webhookData, _ := json.Marshal(req)
	if len(bodyBytes) > 0 {
		webhookData = bodyBytes
	}

	result, err := h.uc.ConfirmPayment(c.Request.Context(), &domain.ConfirmPaymentInput{
		OrderCode:   req.OrderCode,
		Status:      req.Status,
		WebhookData: webhookData,
	})
	if err != nil {
		response.HandleError(c, mapPaymentError(err))
		return
	}

	response.Success(c, PaymentWebhookResponse{
		Message:   "payment processed",
		BookingID: result.Booking.ID,
		Status:    string(result.Booking.Status),
	})
}

func mapPaymentError(err error) error {
	switch {
	case errors.Is(err, domain.ErrPaymentNotFound):
		return pkgErrors.ErrPaymentNotFound
	case errors.Is(err, domain.ErrPaymentAlreadyDone):
		return pkgErrors.ErrPaymentAlreadyProcessed
	case errors.Is(err, domain.ErrBookingNotPending):
		return pkgErrors.ErrBookingNotPending
	case errors.Is(err, domain.ErrBookingNotFound):
		return pkgErrors.ErrBookingNotFound
	default:
		return pkgErrors.Wrap(err, 500, pkgErrors.ErrCodeInternal)
	}
}
