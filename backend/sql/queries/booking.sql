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
    booked_seats = array_cat(COALESCE(booked_seats, '{}'::text[]), $2::text[]),
    available_seats = available_seats - $3,
    version = version + 1
WHERE id = $1 
  AND version = $4
  AND available_seats >= $3
RETURNING *;

-- name: ReleaseTripSeats :one
-- Release seats when booking cancelled/expired (using array subtraction)
UPDATE trips SET
    booked_seats = ARRAY(SELECT unnest(COALESCE(booked_seats, '{}'::text[])) EXCEPT SELECT unnest($2::text[])),
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

-- name: ListAdminBookings :many
SELECT b.*, t.departure_time, t.arrival_time,
       o.name as origin_name, d.name as destination_name
FROM bookings b
JOIN trips t ON b.trip_id = t.id
JOIN locations o ON t.origin_id = o.id
JOIN locations d ON t.destination_id = d.id
WHERE ($1::text = '' OR b.status = $1)
  AND ($2::bigint = 0 OR b.trip_id = $2)
  AND (
    $3::text = ''
    OR b.code ILIKE '%' || $3 || '%'
    OR COALESCE(b.guest_info->>'name', '') ILIKE '%' || $3 || '%'
    OR COALESCE(b.guest_info->>'phone', '') ILIKE '%' || $3 || '%'
  )
ORDER BY b.created_at DESC
LIMIT $4 OFFSET $5;

-- name: CountAdminBookings :one
SELECT COUNT(*)
FROM bookings b
WHERE ($1::text = '' OR b.status = $1)
  AND ($2::bigint = 0 OR b.trip_id = $2)
  AND (
    $3::text = ''
    OR b.code ILIKE '%' || $3 || '%'
    OR COALESCE(b.guest_info->>'name', '') ILIKE '%' || $3 || '%'
    OR COALESCE(b.guest_info->>'phone', '') ILIKE '%' || $3 || '%'
  );

-- name: GetAdminBookingStats :one
SELECT
    COUNT(*)::bigint AS total_bookings,
    COUNT(*) FILTER (WHERE status = 'pending')::bigint AS unpaid_bookings,
    COUNT(*) FILTER (WHERE status = 'paid')::bigint AS paid_bookings,
    COUNT(*) FILTER (WHERE status = 'refund_pending')::bigint AS refund_pending_bookings,
    COUNT(*) FILTER (WHERE status = 'cancelled')::bigint AS cancelled_bookings,
    COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid'), 0)::numeric AS paid_revenue,
    COALESCE(SUM(total_amount) FILTER (WHERE status = 'pending'), 0)::numeric AS unpaid_revenue,
    COUNT(DISTINCT trip_id) FILTER (WHERE status IN ('pending', 'paid', 'refund_pending'))::bigint AS active_trip_count
FROM bookings;

-- name: GetAdminBookingRevenueSeries :many
WITH day_series AS (
    SELECT generate_series(
        (CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day'))::date,
        CURRENT_DATE::date,
        INTERVAL '1 day'
    )::date AS day
)
SELECT
    ds.day,
    COUNT(b.id)::bigint AS total_bookings,
    COUNT(b.id) FILTER (WHERE b.status = 'paid')::bigint AS paid_bookings,
    COUNT(b.id) FILTER (WHERE b.status = 'pending')::bigint AS unpaid_bookings,
    COALESCE(SUM(b.total_amount) FILTER (WHERE b.status = 'paid'), 0)::numeric AS paid_revenue
FROM day_series ds
LEFT JOIN bookings b ON DATE(b.created_at) = ds.day
GROUP BY ds.day
ORDER BY ds.day ASC;

-- name: ListActiveSeatCodesByUserTrip :many
SELECT DISTINCT seat_codes.seat_code::text AS seat_code
FROM bookings b
CROSS JOIN LATERAL unnest(COALESCE(b.seat_codes, '{}'::text[])) AS seat_codes(seat_code)
WHERE b.user_id = $1
  AND b.trip_id = $2
  AND b.status IN ('pending', 'paid', 'refund_pending');

-- name: ListActiveBookingsByTrip :many
SELECT b.*, t.departure_time, t.arrival_time,
       o.name as origin_name, d.name as destination_name
FROM bookings b
JOIN trips t ON b.trip_id = t.id
JOIN locations o ON t.origin_id = o.id
JOIN locations d ON t.destination_id = d.id
WHERE b.trip_id = $1
  AND b.status IN ('pending', 'paid', 'refund_pending')
ORDER BY b.created_at DESC;

-- ============================================================================
-- REFUND FLOW QUERIES
-- ============================================================================

-- name: MarkBookingRefunded :one
UPDATE bookings SET
    status = 'cancelled',
    refunded_at = NOW(),
    refund_reference = $2,
    refund_note = $3,
    updated_at = NOW()
WHERE id = $1 AND status = 'refund_pending'
RETURNING *;

-- ============================================================================
-- ADMIN REFUND FLOW QUERIES
-- ============================================================================

-- name: MarkBookingRefundPending :one
UPDATE bookings SET
    status = 'refund_pending',
    refunded_at = NULL,
    updated_at = NOW()
WHERE id = $1 AND status IN ('paid', 'pending')
RETURNING *;

-- name: ListRefundPendingBookings :many
SELECT b.*, t.departure_time, t.arrival_time,
       o.name as origin_name, d.name as destination_name
FROM bookings b
JOIN trips t ON b.trip_id = t.id
JOIN locations o ON t.origin_id = o.id
JOIN locations d ON t.destination_id = d.id
WHERE b.status = 'refund_pending'
ORDER BY b.updated_at ASC
LIMIT $1 OFFSET $2;

-- name: CountRefundPendingBookings :one
SELECT COUNT(*) FROM bookings WHERE status = 'refund_pending';

-- name: RevertBookingToPaid :one
UPDATE bookings SET
    status = 'paid',
    refunded_at = NULL,
    updated_at = NOW()
WHERE id = $1 AND status = 'refund_pending'
RETURNING *;
