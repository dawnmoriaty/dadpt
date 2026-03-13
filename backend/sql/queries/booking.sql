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

-- ============================================================================
-- BOOKING LOCKING QUERIES - For race condition handling
-- ============================================================================

-- name: LockTripForBooking :one
-- Lock trip row for atomic seat update (NOWAIT = fail fast if locked)
SELECT * FROM trips WHERE id = $1 FOR UPDATE NOWAIT;

-- name: UpdateTripSeatsAtomic :one
-- Optimistic locking: only update if version matches and seats available
UPDATE trips SET
    booked_seats = array_cat(booked_seats, $2::text[]),
    available_seats = available_seats - $3,
    version = version + 1
WHERE id = $1 
  AND version = $4
  AND available_seats >= $3
RETURNING *;

-- name: ReleaseTripSeats :one
-- Release seats when booking cancelled/expired (using array subtraction)
UPDATE trips SET
    booked_seats = ARRAY(SELECT unnest(booked_seats) EXCEPT SELECT unnest($2::text[])),
    available_seats = available_seats + $3,
    version = version + 1
WHERE id = $1
RETURNING *;

-- name: CreateBookingWithExpiry :one
INSERT INTO bookings (
    code, trip_id, user_id, guest_info,
    pickup_info, dropoff_info, seat_codes,
    total_amount, payment_method, expires_at
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: GetExpiredPendingBookings :many
-- FOR UPDATE SKIP LOCKED: safe concurrent processing without deadlock
SELECT * FROM bookings 
WHERE status = 'pending' AND expires_at < NOW()
FOR UPDATE SKIP LOCKED
LIMIT $1;

-- name: CountBookingsByTrip :one
SELECT COUNT(*) FROM bookings WHERE trip_id = $1 AND status IN ('pending', 'paid');

-- ============================================================================
-- PAYMENT FLOW QUERIES
-- ============================================================================

-- name: GetBookingForPayment :one
-- Lock booking row for payment processing (prevent double-pay)
SELECT * FROM bookings WHERE id = $1 FOR UPDATE NOWAIT;

-- name: MarkBookingPaid :one
UPDATE bookings SET
    status = 'paid',
    expires_at = NULL,
    updated_at = NOW()
WHERE id = $1 AND status = 'pending'
RETURNING *;

-- name: MarkBookingExpired :one
UPDATE bookings SET
    status = 'expired',
    updated_at = NOW()
WHERE id = $1 AND status = 'pending'
RETURNING *;

-- name: CountBookingsByUser :one
SELECT COUNT(*) FROM bookings WHERE user_id = $1;
