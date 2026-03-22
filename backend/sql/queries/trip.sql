-- name: GetTripByID :one
SELECT t.*,
       p.name as provider_name,
       bt.name as bus_type_name, bt.seat_layout as seat_layout, b.image_url as bus_image_url,
       o.name as origin_name, o.city as origin_city,
       d.name as destination_name, d.city as destination_city
FROM trips t
JOIN providers p ON t.provider_id = p.id
JOIN buses b ON t.bus_id = b.id
JOIN bus_types bt ON b.bus_type_id = bt.id
JOIN locations o ON t.origin_id = o.id
JOIN locations d ON t.destination_id = d.id
WHERE t.id = $1;

-- name: SearchTrips :many
SELECT t.*, 
       p.name as provider_name,
       bt.name as bus_type_name, bt.seat_layout as seat_layout, b.image_url as bus_image_url,
       o.name as origin_name, o.city as origin_city,
       d.name as destination_name, d.city as destination_city
FROM trips t
JOIN providers p ON t.provider_id = p.id
JOIN buses b ON t.bus_id = b.id
JOIN bus_types bt ON b.bus_type_id = bt.id
JOIN locations o ON t.origin_id = o.id
JOIN locations d ON t.destination_id = d.id
WHERE t.origin_id = $1
  AND t.destination_id = $2
  AND DATE(t.departure_time AT TIME ZONE 'Asia/Ho_Chi_Minh') = $3::date
  AND t.available_seats >= $4
  AND t.status = 'scheduled'
ORDER BY t.departure_time
LIMIT $5 OFFSET $6;

-- name: CountSearchTrips :one
SELECT COUNT(*) FROM trips
WHERE origin_id = $1
  AND destination_id = $2
  AND DATE(departure_time AT TIME ZONE 'Asia/Ho_Chi_Minh') = $3::date
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

-- name: UpdateTrip :one
UPDATE trips SET
    origin_id = COALESCE($2, origin_id),
    destination_id = COALESCE($3, destination_id),
    departure_time = COALESCE($4, departure_time),
    arrival_time = COALESCE($5, arrival_time),
    base_price = COALESCE($6, base_price),
    price_modifier = COALESCE($7, price_modifier),
    is_hot_deal = COALESCE($8, is_hot_deal),
    pickup_points = COALESCE($9, pickup_points),
    dropoff_points = COALESCE($10, dropoff_points),
    available_seats = COALESCE($11, available_seats)
WHERE id = $1
RETURNING *;

-- name: DeleteTrip :exec
DELETE FROM trips WHERE id = $1;

-- name: ListTripsAdmin :many
SELECT t.*, 
       p.name as provider_name,
       bt.name as bus_type_name, bt.seat_layout as seat_layout, b.image_url as bus_image_url,
       o.name as origin_name, o.city as origin_city,
       d.name as destination_name, d.city as destination_city
FROM trips t
JOIN providers p ON t.provider_id = p.id
JOIN buses b ON t.bus_id = b.id
JOIN bus_types bt ON b.bus_type_id = bt.id
JOIN locations o ON t.origin_id = o.id
JOIN locations d ON t.destination_id = d.id
WHERE (sqlc.narg('provider_id')::int IS NULL OR t.provider_id = sqlc.narg('provider_id'))
  AND (sqlc.narg('status')::text IS NULL OR t.status = sqlc.narg('status'))
ORDER BY t.created_at DESC
LIMIT $1 OFFSET $2;

-- name: CountTripsAdmin :one
SELECT COUNT(*) FROM trips
WHERE (sqlc.narg('provider_id')::int IS NULL OR provider_id = sqlc.narg('provider_id'))
  AND (sqlc.narg('status')::text IS NULL OR status = sqlc.narg('status'));

-- name: CountActiveBookingsByTripID :one
SELECT COUNT(*) FROM bookings
WHERE trip_id = $1
  AND status IN ('pending', 'paid');

-- name: BrowseUpcomingTrips :many
SELECT t.*,
       p.name as provider_name,
       bt.name as bus_type_name, bt.seat_layout as seat_layout, b.image_url as bus_image_url,
       o.name as origin_name, o.city as origin_city,
       d.name as destination_name, d.city as destination_city
FROM trips t
JOIN providers p ON t.provider_id = p.id
JOIN buses b ON t.bus_id = b.id
JOIN bus_types bt ON b.bus_type_id = bt.id
JOIN locations o ON t.origin_id = o.id
JOIN locations d ON t.destination_id = d.id
WHERE t.status = 'scheduled'
  AND t.departure_time > NOW()
  AND t.available_seats > 0
  AND (sqlc.narg('provider_id')::int IS NULL OR t.provider_id = sqlc.narg('provider_id'))
  AND (sqlc.narg('bus_type_id')::int IS NULL OR b.bus_type_id = sqlc.narg('bus_type_id'))
ORDER BY t.departure_time ASC
LIMIT $1 OFFSET $2;

-- name: CountBrowseUpcomingTrips :one
SELECT COUNT(*)
FROM trips t
JOIN buses b ON t.bus_id = b.id
WHERE t.status = 'scheduled'
  AND t.departure_time > NOW()
  AND t.available_seats > 0
  AND (sqlc.narg('provider_id')::int IS NULL OR t.provider_id = sqlc.narg('provider_id'))
  AND (sqlc.narg('bus_type_id')::int IS NULL OR b.bus_type_id = sqlc.narg('bus_type_id'));

