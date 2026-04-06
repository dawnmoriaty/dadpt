package domain

import "context"

type PaymentGateway interface {
	CreatePaymentLink(ctx context.Context, orderCode int64, amount int, description string, expiresAt int64, returnURL, cancelURL string) (*PaymentLinkResult, error)

	VerifyWebhookData(ctx context.Context, body map[string]interface{}) (*WebhookResult, error)

	GetPaymentStatus(ctx context.Context, orderCode int64) (string, error)

	CancelPaymentLink(ctx context.Context, orderCode int64, reason string) error
}
