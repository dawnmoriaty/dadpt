package infrastructure

import (
	"context"
	"encoding/json"
	"fmt"

	"backend/configs"
	paymentDomain "backend/internals/payment/domain"
	"backend/pkgs/logger"

	payos "github.com/payOSHQ/payos-lib-golang/v2"
)

// Compile-time interface check
var _ paymentDomain.PaymentGateway = (*PayOSAdapter)(nil)

// PayOSAdapter implements PaymentGateway using PayOS SDK v2.
type PayOSAdapter struct {
	client    *payos.PayOS
	returnURL string
	cancelURL string
}

// NewPayOSAdapter creates a new PayOS adapter from config.
func NewPayOSAdapter(cfg *configs.Config) (*PayOSAdapter, error) {
	client, err := payos.NewPayOS(&payos.PayOSOptions{
		ClientId:    cfg.PayOSClientID,
		ApiKey:      cfg.PayOSAPIKey,
		ChecksumKey: cfg.PayOSChecksumKey,
	})
	if err != nil {
		return nil, fmt.Errorf("creating payos client: %w", err)
	}

	return &PayOSAdapter{
		client:    client,
		returnURL: cfg.PayOSReturnURL,
		cancelURL: cfg.PayOSCancelURL,
	}, nil
}

// CreatePaymentLink creates a new payment link via PayOS.
func (a *PayOSAdapter) CreatePaymentLink(ctx context.Context, orderCode int64, amount int, description string, expiresAt int64, returnURL, cancelURL string) (*paymentDomain.PaymentLinkResult, error) {
	finalReturnURL := a.returnURL
	finalCancelURL := a.cancelURL
	if returnURL != "" {
		finalReturnURL = returnURL
	}
	if cancelURL != "" {
		finalCancelURL = cancelURL
	}

	req := payos.CreatePaymentLinkRequest{
		OrderCode:   orderCode,
		Amount:      amount,
		Description: description,
		ReturnUrl:   finalReturnURL,
		CancelUrl:   finalCancelURL,
	}

	if expiresAt > 0 {
		exp := int(expiresAt)
		req.ExpiredAt = &exp // payos library uses *int for ExpiredAt
	}

	result, err := a.client.PaymentRequests.Create(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("payos.CreatePaymentLink: %w", err)
	}

	return &paymentDomain.PaymentLinkResult{
		CheckoutURL:   result.CheckoutUrl,
		QRCode:        result.QrCode,
		PaymentLinkID: result.PaymentLinkId,
	}, nil
}

// VerifyWebhookData verifies PayOS webhook payload signature and returns parsed data.
func (a *PayOSAdapter) VerifyWebhookData(ctx context.Context, body map[string]interface{}) (*paymentDomain.WebhookResult, error) {
	data, err := a.client.Webhooks.VerifyData(ctx, body)
	if err != nil {
		return nil, fmt.Errorf("payos.VerifyWebhookData: %w", err)
	}

	// data is interface{} — marshal/unmarshal to get typed fields
	raw, err := json.Marshal(data)
	if err != nil {
		return nil, fmt.Errorf("marshaling webhook data: %w", err)
	}

	var webhookData payos.WebhookData
	if err := json.Unmarshal(raw, &webhookData); err != nil {
		return nil, fmt.Errorf("unmarshaling webhook data: %w", err)
	}

	logger.Info("PayOS webhook verified: orderCode=%d, code=%s", webhookData.OrderCode, webhookData.Code)

	return &paymentDomain.WebhookResult{
		OrderCode: webhookData.OrderCode,
		Amount:    webhookData.Amount,
		Code:      webhookData.Code,
		Desc:      webhookData.Desc,
	}, nil
}

// GetPaymentStatus retrieves payment link status from PayOS.
func (a *PayOSAdapter) GetPaymentStatus(ctx context.Context, orderCode int64) (string, error) {
	result, err := a.client.PaymentRequests.Get(ctx, orderCode)
	if err != nil {
		return "", fmt.Errorf("payos.GetPaymentStatus: %w", err)
	}

	return string(result.Status), nil
}

// CancelPaymentLink cancels a payment link via PayOS.
// If the payment was already paid, PayOS handles the refund to the original bank account.
func (a *PayOSAdapter) CancelPaymentLink(ctx context.Context, orderCode int64, reason string) error {
	var reasonPtr *string
	if reason != "" {
		reasonPtr = &reason
	}

	_, err := a.client.PaymentRequests.Cancel(ctx, orderCode, reasonPtr)
	if err != nil {
		return fmt.Errorf("payos.CancelPaymentLink: %w", err)
	}

	logger.Info("PayOS payment link cancelled: orderCode=%d, reason=%s", orderCode, reason)
	return nil
}
