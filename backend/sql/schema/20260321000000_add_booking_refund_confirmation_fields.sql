-- +goose Up
-- +goose StatementBegin

ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS refund_reference VARCHAR(100),
    ADD COLUMN IF NOT EXISTS refund_note TEXT;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE bookings
    DROP COLUMN IF EXISTS refund_note,
    DROP COLUMN IF EXISTS refund_reference;

-- +goose StatementEnd
