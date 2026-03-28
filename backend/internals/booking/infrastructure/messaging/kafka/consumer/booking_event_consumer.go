package consumer

import (
	"context"
	"encoding/json"

	"backend/internals/booking/infrastructure"
	"backend/pkgs/kafka"
	"backend/pkgs/logger"
	kafka_config "backend/pkgs/messaging/kafka"
	"backend/pkgs/messaging"
)

// BookingNotificationConsumer subscribes to booking events and broadcasts them via SSE
type BookingNotificationConsumer struct {
	kafkaClient kafka.IKafka
	hub         *infrastructure.SSEHub
}

func NewBookingNotificationConsumer(kafkaClient kafka.IKafka, hub *infrastructure.SSEHub) *BookingNotificationConsumer {
	return &BookingNotificationConsumer{kafkaClient: kafkaClient, hub: hub}
}

func (c *BookingNotificationConsumer) Start(ctx context.Context) {
	if c.kafkaClient == nil {
		logger.Warn("BookingNotificationConsumer: Kafka not available, skipping")
		return
	}

	consumer := c.kafkaClient.NewConsumer(
		kafka_config.TopicBookingEvents,
		kafka_config.GroupBookingWorkers,
		c.handleMessage,
	)

	logger.Info("BookingNotificationConsumer started listening to %s", kafka_config.TopicBookingEvents)

	if err := consumer.Start(ctx); err != nil && err != context.Canceled {
		logger.Error("BookingNotificationConsumer stopped with error: %v", err)
	} else {
		logger.Info("BookingNotificationConsumer stopped gracefully")
	}
}

func (c *BookingNotificationConsumer) handleMessage(ctx context.Context, msg kafka.Message) error {
	var envelope messaging.EventEnvelope
	if err := json.Unmarshal(msg.Value, &envelope); err != nil {
		logger.Error("BookingKafkaConsumer: failed to unmarshal event: %v", err)
		return nil // Auto-commit to prevent blocking
	}

	if envelope.EventType == "" || envelope.EventID == "" || len(envelope.Payload) == 0 {
		logger.Error("BookingKafkaConsumer: invalid event envelope: %s", string(msg.Value))
		return nil
	}

	// Send to SSE Hub
	c.hub.Broadcast(msg.Value)
	return nil
}
