-- +goose Up
-- +goose StatementBegin

ALTER TABLE payment_transactions
    ADD COLUMN IF NOT EXISTS checkout_url TEXT,
    ADD COLUMN IF NOT EXISTS qr_code TEXT;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE payment_transactions
    DROP COLUMN IF EXISTS qr_code,
    DROP COLUMN IF EXISTS checkout_url;

-- +goose StatementEnd
