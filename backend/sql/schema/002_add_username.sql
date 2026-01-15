-- +goose Up
-- +goose StatementBegin
ALTER TABLE users 
ADD COLUMN username VARCHAR(50) UNIQUE;

-- Create index for faster lookup
CREATE INDEX idx_users_username ON users(username);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_users_username;
ALTER TABLE users DROP COLUMN IF EXISTS username;
-- +goose StatementEnd
