-- +goose Up
-- +goose StatementBegin

-- Add version column to trips for optimistic locking
ALTER TABLE trips ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;

-- Add expires_at column to bookings for pending timeout
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Create index for expired pending bookings cleanup
CREATE INDEX IF NOT EXISTS idx_bookings_pending_expired ON bookings(status, expires_at) 
  WHERE status = 'pending';

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP INDEX IF EXISTS idx_bookings_pending_expired;
ALTER TABLE bookings DROP COLUMN IF EXISTS expires_at;
ALTER TABLE trips DROP COLUMN IF EXISTS version;

-- +goose StatementEnd
