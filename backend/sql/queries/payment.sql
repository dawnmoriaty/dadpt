-- name: CreatePaymentTransaction :one
INSERT INTO payment_transactions (booking_id, order_code, amount, payment_method)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetPaymentByOrderCode :one
SELECT * FROM payment_transactions WHERE order_code = $1;

-- name: GetPaymentsByBookingID :many
SELECT * FROM payment_transactions WHERE booking_id = $1 ORDER BY created_at DESC;

-- name: UpdatePaymentSuccess :one
UPDATE payment_transactions SET
    status = 'success',
    webhook_data = $2,
    paid_at = NOW()
WHERE order_code = $1 AND status = 'pending'
RETURNING *;

-- name: UpdatePaymentFailed :one
UPDATE payment_transactions SET
    status = 'failed',
    webhook_data = $2
WHERE order_code = $1 AND status = 'pending'
RETURNING *;

-- name: UpdatePaymentRefunded :one
UPDATE payment_transactions SET
    status = 'refunded',
    refunded_at = NOW()
WHERE booking_id = $1 AND status = 'success'
RETURNING *;

-- name: GetSuccessPaymentByBookingID :one
SELECT * FROM payment_transactions WHERE booking_id = $1 AND status = 'success' LIMIT 1;
