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
