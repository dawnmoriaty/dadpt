-- +goose Up
-- +goose StatementBegin

-- Add image_url to providers (logo/avatar)
ALTER TABLE providers ADD COLUMN image_url VARCHAR(500);

-- Add image_url to buses (bus photo)
ALTER TABLE buses ADD COLUMN image_url VARCHAR(500);

-- Add image_url to locations (station/terminal photo)
ALTER TABLE locations ADD COLUMN image_url VARCHAR(500);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE locations DROP COLUMN IF EXISTS image_url;
ALTER TABLE buses DROP COLUMN IF EXISTS image_url;
ALTER TABLE providers DROP COLUMN IF EXISTS image_url;

-- +goose StatementEnd
