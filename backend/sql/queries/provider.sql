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

-- name: UpdateProvider :one
UPDATE providers SET 
    name = COALESCE($2, name),
    hotline = COALESCE($3, hotline),
    slug = COALESCE($4, slug),
    policy_refund = COALESCE($5, policy_refund)
WHERE id = $1
RETURNING *;

-- name: DeleteProvider :exec
DELETE FROM providers WHERE id = $1;

-- name: ListProvidersAdmin :many
SELECT * FROM providers
WHERE (sqlc.narg('q')::text IS NULL OR (
  name ILIKE '%' || sqlc.narg('q')::text || '%'
  OR hotline ILIKE '%' || sqlc.narg('q')::text || '%'
  OR slug ILIKE '%' || sqlc.narg('q')::text || '%'
))
AND (sqlc.narg('is_active')::boolean IS NULL OR is_active = sqlc.narg('is_active'))
ORDER BY name
LIMIT $1 OFFSET $2;

-- name: CountProviders :one
SELECT COUNT(*) FROM providers
WHERE (sqlc.narg('q')::text IS NULL OR (
  name ILIKE '%' || sqlc.narg('q')::text || '%'
  OR hotline ILIKE '%' || sqlc.narg('q')::text || '%'
  OR slug ILIKE '%' || sqlc.narg('q')::text || '%'
))
AND (sqlc.narg('is_active')::boolean IS NULL OR is_active = sqlc.narg('is_active'));

-- name: ToggleProviderActive :one
UPDATE providers SET is_active = NOT is_active WHERE id = $1 RETURNING *;

