package outbox

import (
	"context"
	"strings"
	"time"

	"backend/pkgs/kafka"
	"backend/pkgs/logger"
	kafka_config "backend/pkgs/messaging/kafka"
	rmq_config "backend/pkgs/messaging/rabbitmq"
	rmq "backend/pkgs/rabbitmq"
)

// Event is the generic outbox event representation
type Event struct {
	ID      string
	Topic   string
	Payload []byte
}

// IRepository must be implemented by the module providing outbox logic (e.g., Booking)
type IRepository interface {
	FetchPendingEvents(ctx context.Context, batchSize int32) ([]Event, error)
	MarkEventPublished(ctx context.Context, id string) error
	MarkEventFailed(ctx context.Context, id string, errStr string) error
}

// Processor is the generic scheduler that forwards outbox entries to message brokers
type Processor struct {
	repo         IRepository
	rmq          rmq.IRabbitMQ
	kafkaClient  kafka.IKafka
	pollInterval time.Duration
	batchSize    int32
}

func NewProcessor(repo IRepository, rmq rmq.IRabbitMQ, kafkaClient kafka.IKafka) *Processor {
	return &Processor{
		repo:         repo,
		rmq:          rmq,
		kafkaClient:  kafkaClient,
		pollInterval: 5 * time.Second,
		batchSize:    20,
	}
}

func (p *Processor) Start(ctx context.Context) {
	ticker := time.NewTicker(p.pollInterval)
	defer ticker.Stop()

	logger.Info("System OutboxProcessor started (poll interval: %v)", p.pollInterval)

	for {
		select {
		case <-ctx.Done():
			logger.Info("System OutboxProcessor stopped")
			return
		case <-ticker.C:
			p.processBatch(ctx)
		}
	}
}

func (p *Processor) processBatch(ctx context.Context) {
	events, err := p.repo.FetchPendingEvents(ctx, p.batchSize)
	if err != nil {
		logger.Error("Outbox: failed to fetch pending events: %v", err)
		return
	}

	for _, event := range events {
		if err := p.publishEvent(ctx, &event); err != nil {
			logger.Error("Outbox: failed to publish event %s: %v", event.ID, err)
			_ = p.repo.MarkEventFailed(ctx, event.ID, err.Error())
			continue
		}

		if err := p.repo.MarkEventPublished(ctx, event.ID); err != nil {
			logger.Error("Outbox: failed to mark event %s as published: %v", event.ID, err)
		}
	}
}

func (p *Processor) publishEvent(ctx context.Context, event *Event) error {
	// Hybrid Routing based on topic pattern.
	// This makes the Outbox processor completely module-agnostic.
	if strings.Contains(event.Topic, "refund") || strings.Contains(event.Topic, "dlq") {
		if p.rmq == nil {
			logger.Warn("Outbox: RabbitMQ not available, skipping event %s", event.ID)
			return nil
		}
		
		producer := p.rmq.NewProducer(rmq_config.ExchangeBooking)
		return producer.PublishRaw(ctx, event.Topic, event.Payload)
	}

	// Default to Kafka for standard event streams
	if p.kafkaClient == nil {
		logger.Warn("Outbox: Kafka not available, skipping event %s", event.ID)
		return nil
	}

	// All main lifecycle events go to unified booking topic for now
	// Ideally event.Topic maps cleanly to Kafka topic.
	topicToPublish := kafka_config.TopicBookingEvents

	producer := p.kafkaClient.NewProducer(topicToPublish)
	defer producer.Close()

	msg := kafka.Message{
		Key:   []byte(event.ID), 
		Value: event.Payload,
		Headers: map[string]string{
			"eventType": event.Topic,
		},
	}
	return producer.Publish(ctx, msg)
}
