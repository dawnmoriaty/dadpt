-- name: CreateOutboxEvent :one
INSERT INTO outbox_events (topic, payload)
VALUES ($1, $2)
RETURNING *;

-- name: GetPendingOutboxEvents :many
SELECT * FROM outbox_events
WHERE status = 'pending'
ORDER BY created_at
LIMIT $1
FOR UPDATE SKIP LOCKED;

-- name: MarkOutboxEventProcessed :exec
UPDATE outbox_events SET 
    status = 'processed',
    processed_at = NOW()
WHERE id = $1;

-- name: MarkOutboxEventFailed :exec
UPDATE outbox_events SET 
    status = 'failed',
    retry_count = retry_count + 1
WHERE id = $1;
