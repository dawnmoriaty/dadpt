package domain

import "errors"


var (
	ErrPaymentGatewayUnavailable = errors.New("payment gateway unavailable")
	ErrPaymentLinkCreationFailed = errors.New("payment link creation failed")
	ErrWebhookVerificationFailed = errors.New("webhook verification failed")
)


type PaymentMethod string

const (
	PaymentMethodBankTransfer PaymentMethod = "bank_transfer"
	PaymentMethodCOD          PaymentMethod = "cod"
	PaymentMethodVisa         PaymentMethod = "visa"
)

func (m PaymentMethod) IsValid() bool {
	switch m {
	case PaymentMethodBankTransfer, PaymentMethodCOD, PaymentMethodVisa:
		return true
	}
	return false
}

func (m PaymentMethod) RequiresGateway() bool {
	switch m {
	case PaymentMethodBankTransfer, PaymentMethodVisa:
		return true
	}
	return false
}


type PaymentLinkResult struct {
	CheckoutURL   string
	QRCode        string
	PaymentLinkID string
}

type WebhookResult struct {
	OrderCode int64
	Amount    int
	Code      string // "00" = success
	Desc      string
}
