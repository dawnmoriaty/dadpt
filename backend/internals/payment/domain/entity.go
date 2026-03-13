package domain

import "errors"

// =============================================================================
// SENTINEL ERRORS
// =============================================================================

var (
	ErrPaymentGatewayUnavailable = errors.New("payment gateway unavailable")
	ErrPaymentLinkCreationFailed = errors.New("payment link creation failed")
	ErrWebhookVerificationFailed = errors.New("webhook verification failed")
)

// =============================================================================
// VALUE OBJECTS
// =============================================================================

// PaymentMethod represents supported payment methods.
type PaymentMethod string

const (
	PaymentMethodBankTransfer PaymentMethod = "bank_transfer"
	PaymentMethodCOD          PaymentMethod = "cod"
	PaymentMethodVisa         PaymentMethod = "visa"
)

// IsValid checks if the payment method is a recognized value.
func (m PaymentMethod) IsValid() bool {
	switch m {
	case PaymentMethodBankTransfer, PaymentMethodCOD, PaymentMethodVisa:
		return true
	}
	return false
}

// RequiresGateway returns true if this payment method needs an online payment gateway.
func (m PaymentMethod) RequiresGateway() bool {
	switch m {
	case PaymentMethodBankTransfer, PaymentMethodVisa:
		return true
	}
	return false
}

// =============================================================================
// RESULT TYPES
// =============================================================================

// PaymentLinkResult holds the result from creating a payment link.
type PaymentLinkResult struct {
	CheckoutURL   string
	QRCode        string
	PaymentLinkID string
}

// WebhookResult holds verified webhook data.
type WebhookResult struct {
	OrderCode int64
	Amount    int
	Code      string // "00" = success
	Desc      string
}
