package repository

import (
	"context"
	"errors"
	"fmt"

	"backend/db"
	"backend/internals/booking/domain"
	"backend/pkgs/utils"
	"backend/sql/models"

	"github.com/jackc/pgx/v5"
)

type paymentRepository struct {
	db      *db.Database
	queries *models.Queries
}

func NewPaymentRepository(database *db.Database) domain.PaymentRepository {
	return &paymentRepository{
		db:      database,
		queries: models.New(database.GetPool()),
	}
}

func (r *paymentRepository) CreateTransaction(ctx context.Context, tx *domain.PaymentTransaction) (*domain.PaymentTransaction, error) {
	result, err := r.queries.CreatePaymentTransaction(ctx, models.CreatePaymentTransactionParams{
		BookingID:     tx.BookingID,
		OrderCode:     tx.OrderCode,
		Amount:        utils.Float64ToNumeric(tx.Amount),
		PaymentMethod: utils.StringToPtr(tx.PaymentMethod),
		CheckoutUrl:   utils.StringToPtr(tx.CheckoutURL),
		QrCode:        utils.StringToPtr(tx.QRCode),
	})
	if err != nil {
		return nil, fmt.Errorf("creating payment transaction: %w", err)
	}
	return paymentToEntity(result), nil
}

func (r *paymentRepository) GetByOrderCode(ctx context.Context, orderCode string) (*domain.PaymentTransaction, error) {
	result, err := r.queries.GetPaymentByOrderCode(ctx, orderCode)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrPaymentNotFound
		}
		return nil, fmt.Errorf("getting payment by order code: %w", err)
	}
	return paymentToEntity(result), nil
}

func (r *paymentRepository) GetLatestByBookingID(ctx context.Context, bookingID int64) (*domain.PaymentTransaction, error) {
	items, err := r.queries.GetPaymentsByBookingID(ctx, bookingID)
	if err != nil {
		return nil, fmt.Errorf("getting payments by booking id: %w", err)
	}
	if len(items) == 0 {
		return nil, domain.ErrPaymentNotFound
	}
	return paymentToEntity(items[0]), nil
}

func (r *paymentRepository) MarkSuccess(ctx context.Context, orderCode string, webhookData []byte) (*domain.PaymentTransaction, error) {
	result, err := r.queries.UpdatePaymentSuccess(ctx, models.UpdatePaymentSuccessParams{
		OrderCode:   orderCode,
		WebhookData: webhookData,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrPaymentAlreadyDone
		}
		return nil, fmt.Errorf("marking payment success: %w", err)
	}
	return paymentToEntity(result), nil
}

func (r *paymentRepository) MarkFailed(ctx context.Context, orderCode string, webhookData []byte) (*domain.PaymentTransaction, error) {
	result, err := r.queries.UpdatePaymentFailed(ctx, models.UpdatePaymentFailedParams{
		OrderCode:   orderCode,
		WebhookData: webhookData,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrPaymentAlreadyDone
		}
		return nil, fmt.Errorf("marking payment failed: %w", err)
	}
	return paymentToEntity(result), nil
}

func (r *paymentRepository) GetSuccessByBookingID(ctx context.Context, bookingID int64) (*domain.PaymentTransaction, error) {
	result, err := r.queries.GetSuccessPaymentByBookingID(ctx, bookingID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrPaymentNotFound
		}
		return nil, fmt.Errorf("getting success payment by booking id: %w", err)
	}
	return paymentToEntity(result), nil
}

func (r *paymentRepository) GetPendingByBookingID(ctx context.Context, bookingID int64) (*domain.PaymentTransaction, error) {
	result, err := r.queries.GetPendingPaymentByBookingID(ctx, bookingID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrPaymentNotFound
		}
		return nil, fmt.Errorf("getting pending payment by booking id: %w", err)
	}
	return paymentToEntity(result), nil
}

func (r *paymentRepository) MarkRefunded(ctx context.Context, bookingID int64) (*domain.PaymentTransaction, error) {
	result, err := r.queries.UpdatePaymentRefunded(ctx, bookingID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrPaymentAlreadyDone
		}
		return nil, fmt.Errorf("marking payment refunded: %w", err)
	}
	return paymentToEntity(result), nil
}

func paymentToEntity(m models.PaymentTransaction) *domain.PaymentTransaction {
	return &domain.PaymentTransaction{
		ID:            m.ID.String(),
		BookingID:     m.BookingID,
		OrderCode:     m.OrderCode,
		Amount:        utils.NumericToFloat64(m.Amount),
		Status:        utils.PtrToString(m.Status),
		PaymentMethod: utils.PtrToString(m.PaymentMethod),
		CheckoutURL:   utils.PtrToString(m.CheckoutUrl),
		QRCode:        utils.PtrToString(m.QrCode),
		WebhookData:   m.WebhookData,
		CreatedAt:     utils.TimestamptzToTime(m.CreatedAt),
		PaidAt:        utils.TimestamptzToTime(m.PaidAt),
		RefundedAt:    utils.TimestamptzToTime(m.RefundedAt),
	}
}
