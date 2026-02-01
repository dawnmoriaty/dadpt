-- name: GetLocationByID :one
SELECT * FROM locations WHERE id = $1;

-- name: SearchLocations :many
SELECT * FROM locations 
WHERE city ILIKE '%' || $1 || '%' 
   OR name ILIKE '%' || $1 || '%'
   OR keywords ILIKE '%' || $1 || '%'
ORDER BY city, name
LIMIT 20;

-- name: ListLocationsByCity :many
SELECT * FROM locations WHERE city = $1 ORDER BY name;

-- name: CreateLocation :one
INSERT INTO locations (name, city, address, keywords)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: UpdateLocation :one
UPDATE locations SET 
    name = COALESCE($2, name),
    city = COALESCE($3, city),
    address = COALESCE($4, address),
    keywords = COALESCE($5, keywords)
WHERE id = $1
RETURNING *;

-- name: DeleteLocation :exec
DELETE FROM locations WHERE id = $1;

-- name: ListLocations :many
SELECT * FROM locations 
ORDER BY city, name
LIMIT $1 OFFSET $2;

-- name: CountLocations :one
SELECT COUNT(*) FROM locations;

