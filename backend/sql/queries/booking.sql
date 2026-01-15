-- name: GetBookingByID :one
SELECT * FROM bookings WHERE id = $1;

-- name: GetBookingByCode :one
SELECT * FROM bookings WHERE code = $1;

-- name: ListBookingsByUser :many
SELECT b.*, t.departure_time, t.arrival_time,
       o.name as origin_name, d.name as destination_name
FROM bookings b
JOIN trips t ON b.trip_id = t.id
JOIN locations o ON t.origin_id = o.id
JOIN locations d ON t.destination_id = d.id
WHERE b.user_id = $1
ORDER BY b.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CreateBooking :one
INSERT INTO bookings (
    code, trip_id, user_id, guest_info,
    pickup_info, dropoff_info, seat_codes,
    total_amount, payment_method
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: UpdateBookingStatus :one
UPDATE bookings SET 
    status = $2,
    updated_at = NOW()
WHERE id = $1
RETURNING *;
