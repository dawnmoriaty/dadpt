package consumer

import (
	"context"
	"encoding/json"

	"backend/internals/booking/domain"
	"backend/internals/booking/infrastructure"
	"backend/pkgs/kafka"
	"backend/pkgs/logger"
	"backend/pkgs/messaging"
	kafka_config "backend/pkgs/messaging/kafka"
)

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
		if c.tryBroadcastLegacyPayload(msg.Value) {
			return nil
		}
		logger.Error("BookingKafkaConsumer: failed to unmarshal event: %v", err)
		return nil
	}

	if envelope.EventType == "" || envelope.EventID == "" || len(envelope.Payload) == 0 {
		if c.tryBroadcastLegacyPayload(msg.Value) {
			return nil
		}
		logger.Error("BookingKafkaConsumer: invalid event envelope: %s", string(msg.Value))
		return nil
	}

	c.hub.Broadcast(msg.Value)
	return nil
}

func (c *BookingNotificationConsumer) tryBroadcastLegacyPayload(raw []byte) bool {
	var rawMap map[string]interface{}
	if err := json.Unmarshal(raw, &rawMap); err != nil {
		return false
	}

	bookingID, ok := rawMap["bookingId"].(float64)
	if !ok || int64(bookingID) == 0 {
		return false
	}

	code := ""
	if v, ok := rawMap["bookingCode"].(string); ok {
		code = v
	} else if v, ok := rawMap["code"].(string); ok {
		code = v
	}
	if code == "" {
		return false
	}

	payload := domain.BookingEventPayload{BookingID: int64(bookingID), Code: code}
	if v, ok := rawMap["amount"].(float64); ok {
		payload.Amount = v
	}
	if v, ok := rawMap["status"].(string); ok {
		payload.Status = v
	}

	wrapped := map[string]interface{}{
		"eventId":       "legacy",
		"eventType":     "booking_event",
		"version":       1,
		"aggregateType": "booking",
		"aggregateId":   int64(bookingID),
		"source":        "legacy",
		"payload":       payload,
	}
	encoded, err := json.Marshal(wrapped)
	if err != nil {
		return false
	}

	c.hub.Broadcast(encoded)
	return true
}
