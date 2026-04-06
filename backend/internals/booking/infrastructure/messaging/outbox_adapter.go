package messaging

import (
	"context"

	"backend/internals/booking/domain"
	"backend/pkgs/messaging/outbox"
)

type OutboxAdapter struct {
	repo domain.OutboxRepository
}

func NewOutboxAdapter(repo domain.OutboxRepository) outbox.IRepository {
	return &OutboxAdapter{repo: repo}
}

func (a *OutboxAdapter) FetchPendingEvents(ctx context.Context, batchSize int32) ([]outbox.Event, error) {
	domainEvents, err := a.repo.GetPendingEvents(ctx, batchSize)
	if err != nil {
		return nil, err
	}

	outboxEvents := make([]outbox.Event, len(domainEvents))
	for i, de := range domainEvents {
		outboxEvents[i] = outbox.Event{
			ID:      de.ID,
			Topic:   de.Topic,
			Payload: de.Payload,
		}
	}
	return outboxEvents, nil
}

func (a *OutboxAdapter) MarkEventPublished(ctx context.Context, id string) error {
	return a.repo.MarkProcessed(ctx, id)
}

func (a *OutboxAdapter) MarkEventFailed(ctx context.Context, id string, errStr string) error {
	return a.repo.MarkFailed(ctx, id)
}
