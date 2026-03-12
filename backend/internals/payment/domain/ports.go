package domain

import "context"

// PaymentGateway defines the interface for external payment providers.
// Implementations: PayOS (bank_transfer), future: Visa gateway, etc.
type PaymentGateway interface {
	// CreatePaymentLink creates a payment link for the given order.
	CreatePaymentLink(ctx context.Context, orderCode int64, amount int, description string, expiresAt int64) (*PaymentLinkResult, error)

	// VerifyWebhookData verifies webhook signature and returns parsed data.
	VerifyWebhookData(ctx context.Context, body map[string]interface{}) (*WebhookResult, error)

	// GetPaymentStatus retrieves payment status from the gateway.
	GetPaymentStatus(ctx context.Context, orderCode int64) (string, error)
}
