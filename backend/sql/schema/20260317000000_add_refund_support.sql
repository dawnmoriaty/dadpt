-- +goose Up
-- +goose StatementBegin

-- Add refunded_at column to bookings for tracking when refund was processed
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- Add refunded_at column to payment_transactions for tracking payment refund time
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE payment_transactions DROP COLUMN IF EXISTS refunded_at;
ALTER TABLE bookings DROP COLUMN IF EXISTS refunded_at;

-- +goose StatementEnd
