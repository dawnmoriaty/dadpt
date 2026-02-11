package infrastructure

import (
	"context"
	"time"

	"backend/internals/booking/domain"
	"backend/pkgs/logger"
	"backend/pkgs/rabbitmq"
)

type OutboxProcessor struct {
	outboxRepo   domain.OutboxRepository
	rmq          rabbitmq.IRabbitMQ
	pollInterval time.Duration
	batchSize    int32
}

func NewOutboxProcessor(
	outboxRepo domain.OutboxRepository,
	rmq rabbitmq.IRabbitMQ,
) *OutboxProcessor {
	return &OutboxProcessor{
		outboxRepo:   outboxRepo,
		rmq:          rmq,
		pollInterval: 5 * time.Second,
		batchSize:    20,
	}
}

func (p *OutboxProcessor) Start(ctx context.Context) {
	logger.Info("Outbox processor started (interval=%s, batch=%d)", p.pollInterval, p.batchSize)

	ticker := time.NewTicker(p.pollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			logger.Info("Outbox processor stopped")
			return
		case <-ticker.C:
			p.processBatch(ctx)
		}
	}
}

func (p *OutboxProcessor) processBatch(ctx context.Context) {
	events, err := p.outboxRepo.GetPendingEvents(ctx, p.batchSize)
	if err != nil {
		logger.Error("Outbox: failed to get pending events: %v", err)
		return
	}

	if len(events) == 0 {
		return
	}

	for _, event := range events {
		if err := p.publishEvent(ctx, event); err != nil {
			logger.Error("Outbox: failed to publish event %s (topic=%s): %v", event.ID, event.Topic, err)
			if markErr := p.outboxRepo.MarkFailed(ctx, event.ID); markErr != nil {
				logger.Error("Outbox: failed to mark event %s as failed: %v", event.ID, markErr)
			}
			continue
		}

		if err := p.outboxRepo.MarkProcessed(ctx, event.ID); err != nil {
			logger.Error("Outbox: failed to mark event %s as processed: %v", event.ID, err)
		}
	}

	logger.Info("Outbox: processed %d events", len(events))
}

func (p *OutboxProcessor) publishEvent(ctx context.Context, event *domain.OutboxEvent) error {
	if p.rmq == nil {
		logger.Warn("Outbox: RabbitMQ not available, skipping event %s", event.ID)
		return nil
	}

	return p.rmq.PublishRaw(ctx, BookingExchange, event.Topic, event.Payload)
}
