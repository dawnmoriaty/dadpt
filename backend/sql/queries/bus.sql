-- name: GetBusByID :one
SELECT b.*, bt.name as bus_type_name, bt.total_seats, p.name as provider_name
FROM buses b
JOIN bus_types bt ON b.bus_type_id = bt.id
JOIN providers p ON b.provider_id = p.id
WHERE b.id = $1;

-- name: ListBusesByProvider :many
SELECT b.*, bt.name as bus_type_name, bt.total_seats, p.name as provider_name
FROM buses b
JOIN bus_types bt ON b.bus_type_id = bt.id
JOIN providers p ON b.provider_id = p.id
WHERE b.provider_id = $1
AND (sqlc.narg('q')::text IS NULL OR (
  b.license_plate ILIKE '%' || sqlc.narg('q')::text || '%'
  OR bt.name ILIKE '%' || sqlc.narg('q')::text || '%'
  OR p.name ILIKE '%' || sqlc.narg('q')::text || '%'
))
AND (sqlc.narg('status')::text IS NULL OR b.status = sqlc.narg('status'))
ORDER BY b.license_plate
LIMIT $2 OFFSET $3;

-- name: ListBuses :many
SELECT b.*, bt.name as bus_type_name, bt.total_seats, p.name as provider_name
FROM buses b
JOIN bus_types bt ON b.bus_type_id = bt.id
JOIN providers p ON b.provider_id = p.id
WHERE (sqlc.narg('q')::text IS NULL OR (
  b.license_plate ILIKE '%' || sqlc.narg('q')::text || '%'
  OR bt.name ILIKE '%' || sqlc.narg('q')::text || '%'
  OR p.name ILIKE '%' || sqlc.narg('q')::text || '%'
))
AND (sqlc.narg('status')::text IS NULL OR b.status = sqlc.narg('status'))
AND (sqlc.narg('provider_id')::int IS NULL OR b.provider_id = sqlc.narg('provider_id'))
ORDER BY p.name, b.license_plate
LIMIT $1 OFFSET $2;

-- name: CountBuses :one
SELECT COUNT(*) FROM buses b
WHERE (sqlc.narg('q')::text IS NULL OR b.license_plate ILIKE '%' || sqlc.narg('q')::text || '%')
AND (sqlc.narg('status')::text IS NULL OR b.status = sqlc.narg('status'))
AND (sqlc.narg('provider_id')::int IS NULL OR b.provider_id = sqlc.narg('provider_id'));

-- name: CountBusesByProvider :one
SELECT COUNT(*) FROM buses b
WHERE b.provider_id = $1
AND (sqlc.narg('q')::text IS NULL OR b.license_plate ILIKE '%' || sqlc.narg('q')::text || '%')
AND (sqlc.narg('status')::text IS NULL OR b.status = sqlc.narg('status'));

-- name: CreateBus :one
INSERT INTO buses (provider_id, bus_type_id, license_plate, status, image_url)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: UpdateBus :one
UPDATE buses SET 
    bus_type_id = COALESCE($2, bus_type_id),
    license_plate = COALESCE($3, license_plate),
    status = COALESCE($4, status),
    image_url = COALESCE($5, image_url)
WHERE id = $1
RETURNING *;

-- name: UpdateBusStatus :one
UPDATE buses SET status = $2 WHERE id = $1 RETURNING *;

-- name: DeleteBus :exec
DELETE FROM buses WHERE id = $1;

-- name: GetBusesByType :many
SELECT * FROM buses WHERE bus_type_id = $1 AND status = 'active';

-- name: BusExistsByLicensePlate :one
SELECT EXISTS (
    SELECT 1
    FROM buses
    WHERE license_plate = $1
);

