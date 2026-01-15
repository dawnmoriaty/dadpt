-- name: GetTripByID :one
SELECT * FROM trips WHERE id = $1;

-- name: SearchTrips :many
SELECT t.*, 
       p.name as provider_name,
       o.name as origin_name, o.city as origin_city,
       d.name as destination_name, d.city as destination_city
FROM trips t
JOIN providers p ON t.provider_id = p.id
JOIN locations o ON t.origin_id = o.id
JOIN locations d ON t.destination_id = d.id
WHERE t.origin_id = $1
  AND t.destination_id = $2
  AND DATE(t.departure_time) = $3
  AND t.available_seats >= $4
  AND t.status = 'scheduled'
ORDER BY t.departure_time
LIMIT $5 OFFSET $6;

-- name: CountSearchTrips :one
SELECT COUNT(*) FROM trips
WHERE origin_id = $1
  AND destination_id = $2
  AND DATE(departure_time) = $3
  AND available_seats >= $4
  AND status = 'scheduled';

-- name: CreateTrip :one
INSERT INTO trips (
    provider_id, bus_id, origin_id, destination_id,
    departure_time, arrival_time, base_price, price_modifier,
    is_hot_deal, pickup_points, dropoff_points, available_seats
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING *;

-- name: UpdateTripSeats :one
UPDATE trips SET
    booked_seats = $2,
    available_seats = $3
WHERE id = $1
RETURNING *;

-- name: UpdateTripStatus :one
UPDATE trips SET status = $2 WHERE id = $1 RETURNING *;
