package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"backend/db"
	"backend/internals/booking/domain"
	"backend/pkgs/utils"
	"backend/sql/models"

	"github.com/google/uuid"
)

type outboxRepository struct {
	db      *db.Database
	queries *models.Queries
}

// NewOutboxRepository creates a new outbox repository
func NewOutboxRepository(database *db.Database) domain.OutboxRepository {
	return &outboxRepository{
		db:      database,
		queries: models.New(database.GetPool()),
	}
}

func (r *outboxRepository) CreateEvent(ctx context.Context, topic string, payload []byte) error {
	_, err := r.queries.CreateOutboxEvent(ctx, models.CreateOutboxEventParams{
		Topic:   topic,
		Payload: json.RawMessage(payload),
	})
	if err != nil {
		return fmt.Errorf("creating outbox event: %w", err)
	}
	return nil
}

func (r *outboxRepository) GetPendingEvents(ctx context.Context, limit int32) ([]*domain.OutboxEvent, error) {
	rows, err := r.queries.GetPendingOutboxEvents(ctx, limit)
	if err != nil {
		return nil, fmt.Errorf("getting pending outbox events: %w", err)
	}

	result := make([]*domain.OutboxEvent, len(rows))
	for i, row := range rows {
		result[i] = &domain.OutboxEvent{
			ID:         row.ID.String(),
			Topic:      row.Topic,
			Payload:    row.Payload,
			Status:     utils.PtrToString(row.Status),
			RetryCount: utils.PtrToInt32(row.RetryCount),
			CreatedAt:  utils.TimestamptzToTime(row.CreatedAt),
		}
	}
	return result, nil
}

func (r *outboxRepository) MarkProcessed(ctx context.Context, eventID string) error {
	id, err := uuid.Parse(eventID)
	if err != nil {
		return fmt.Errorf("invalid UUID %q: %w", eventID, err)
	}
	return r.queries.MarkOutboxEventProcessed(ctx, id)
}

func (r *outboxRepository) MarkFailed(ctx context.Context, eventID string) error {
	id, err := uuid.Parse(eventID)
	if err != nil {
		return fmt.Errorf("invalid UUID %q: %w", eventID, err)
	}
	return r.queries.MarkOutboxEventFailed(ctx, id)
}
