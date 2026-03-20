-- name: GetBusTypeByID :one
SELECT * FROM bus_types WHERE id = $1;

-- name: ListBusTypes :many
SELECT * FROM bus_types
WHERE (sqlc.narg('q')::text IS NULL OR name ILIKE '%' || sqlc.narg('q')::text || '%')
ORDER BY name
LIMIT $1 OFFSET $2;

-- name: CountBusTypes :one
SELECT COUNT(*) FROM bus_types
WHERE (sqlc.narg('q')::text IS NULL OR name ILIKE '%' || sqlc.narg('q')::text || '%');

-- name: CreateBusType :one
INSERT INTO bus_types (name, total_seats, seat_layout)
VALUES ($1, $2, $3)
RETURNING *;

-- name: UpdateBusType :one
UPDATE bus_types SET 
    name = COALESCE($2, name),
    total_seats = COALESCE($3, total_seats),
    seat_layout = COALESCE($4, seat_layout)
WHERE id = $1
RETURNING *;

-- name: DeleteBusType :exec
DELETE FROM bus_types WHERE id = $1;

-- name: ListBusTypesPublic :many
SELECT * FROM bus_types ORDER BY name;
