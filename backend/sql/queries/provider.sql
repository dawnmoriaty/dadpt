-- name: GetProviderByID :one
SELECT * FROM providers WHERE id = $1;

-- name: GetProviderBySlug :one
SELECT * FROM providers WHERE slug = $1;

-- name: ListProviders :many
SELECT * FROM providers WHERE is_active = true ORDER BY name;

-- name: CreateProvider :one
INSERT INTO providers (name, hotline, slug, policy_refund)
VALUES ($1, $2, $3, $4)
RETURNING *;
