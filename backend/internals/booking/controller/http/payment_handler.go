package http

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strconv"

	"backend/internals/booking/domain"
	"backend/internals/booking/usecase"
	paymentDomain "backend/internals/payment/domain"
	pkgErrors "backend/pkgs/errors"
	"backend/pkgs/response"

	"github.com/gin-gonic/gin"
)

// PaymentStatusResponse is the response for payment status queries
type PaymentStatusResponse struct {
	OrderCode string `json:"orderCode"`
	Status    string `json:"status"`
}

// PaymentWebhookResponse is the response to the webhook
type PaymentWebhookResponse struct {
	Message   string `json:"message"`
	BookingID int64  `json:"bookingId,omitempty"`
	Status    string `json:"status,omitempty"`
}

type simpleWebhookRequest struct {
	OrderCode string `json:"orderCode"`
	Status    string `json:"status"`
}

type PaymentHandler struct {
	uc        usecase.IBookingUseCase
	paymentGw paymentDomain.PaymentGateway
}

// NewPaymentHandler creates a new payment handler
func NewPaymentHandler(uc usecase.IBookingUseCase, paymentGw paymentDomain.PaymentGateway) *PaymentHandler {
	return &PaymentHandler{uc: uc, paymentGw: paymentGw}
}

// HandleWebhook POST /payments/webhook
// Receives payment confirmation from gateway, verifies signature, updates booking.
func (h *PaymentHandler) HandleWebhook(c *gin.Context) {
	// 1. Read raw body
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
		return
	}

	// 2. Parse as generic map for signature verification
	var webhookBody map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &webhookBody); err != nil {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
		return
	}

	// 3. Verify signature and extract data
	var orderCodeStr string
	var paymentStatus string

	if h.paymentGw != nil {
		webhookResult, err := h.paymentGw.VerifyWebhookData(c.Request.Context(), webhookBody)
		if err != nil {
			response.HandleError(c, mapPaymentError(err))
			return
		}

		orderCodeStr = fmt.Sprintf("%d", webhookResult.OrderCode)
		if webhookResult.Code == "00" {
			paymentStatus = "success"
		} else {
			paymentStatus = "failed"
		}
	} else {
		var simpleReq simpleWebhookRequest
		if err := json.Unmarshal(bodyBytes, &simpleReq); err != nil {
			response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
			return
		}
		orderCodeStr = simpleReq.OrderCode
		paymentStatus = simpleReq.Status
	}

	if orderCodeStr == "" || paymentStatus == "" {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
		return
	}

	// 4. Call usecase
	result, err := h.uc.ConfirmPayment(c.Request.Context(), &domain.ConfirmPaymentInput{
		OrderCode:   orderCodeStr,
		Status:      paymentStatus,
		WebhookData: bodyBytes,
	})
	if err != nil {
		response.HandleError(c, mapPaymentError(err))
		return
	}

	// 5. Response
	response.Success(c, PaymentWebhookResponse{
		Message:   "payment processed",
		BookingID: result.Booking.ID,
		Status:    string(result.Booking.Status),
	})
}

// GetPaymentStatus GET /payments/:orderCode/status
// Returns payment status for frontend polling.
func (h *PaymentHandler) GetPaymentStatus(c *gin.Context) {
	orderCode := c.Param("orderCode")
	if orderCode == "" {
		response.HandleError(c, pkgErrors.ValidationError(pkgErrors.ErrCodeValidation))
		return
	}

	// Try gateway first
	if h.paymentGw != nil {
		orderCodeInt, err := strconv.ParseInt(orderCode, 10, 64)
		if err == nil {
			status, err := h.paymentGw.GetPaymentStatus(c.Request.Context(), orderCodeInt)
			if err == nil {
				response.Success(c, PaymentStatusResponse{
					OrderCode: orderCode,
					Status:    mapGatewayStatus(status),
				})
				return
			}
		}
	}

	// Fallback: check DB
	payment, err := h.uc.GetPaymentByOrderCode(c.Request.Context(), orderCode)
	if err != nil {
		response.HandleError(c, mapPaymentError(err))
		return
	}

	response.Success(c, PaymentStatusResponse{
		OrderCode: orderCode,
		Status:    payment.Status,
	})
}

// mapGatewayStatus maps gateway-specific status to internal status.
func mapGatewayStatus(gatewayStatus string) string {
	switch gatewayStatus {
	case "PAID":
		return "success"
	case "CANCELLED", "EXPIRED", "FAILED":
		return "failed"
	default:
		return "pending"
	}
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
