-- +goose Up
-- +goose StatementBegin

-- Payment transactions table for tracking payment lifecycle (PayOS integration)
CREATE TABLE payment_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES bookings(id),
    order_code VARCHAR(50) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',       -- pending, success, failed, cancelled
    payment_method VARCHAR(20),
    webhook_data JSONB,                          -- Raw webhook payload for audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

CREATE INDEX idx_payment_tx_booking ON payment_transactions(booking_id);
CREATE INDEX idx_payment_tx_order ON payment_transactions(order_code);
CREATE INDEX idx_payment_tx_status ON payment_transactions(status) WHERE status = 'pending';

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP INDEX IF EXISTS idx_payment_tx_status;
DROP INDEX IF EXISTS idx_payment_tx_order;
DROP INDEX IF EXISTS idx_payment_tx_booking;
DROP TABLE IF EXISTS payment_transactions;

-- +goose StatementEnd
