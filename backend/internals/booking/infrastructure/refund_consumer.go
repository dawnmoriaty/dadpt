package infrastructure

import (
	"context"

	"backend/pkgs/logger"
	"backend/pkgs/rabbitmq"
)

// RefundEventConsumer consumes refund request events from RabbitMQ
// and broadcasts them to the SSE hub for admin real-time notifications.
type RefundEventConsumer struct {
	rmq rabbitmq.IRabbitMQ
	hub *SSEHub
}

// NewRefundEventConsumer creates a new consumer for refund request events.
func NewRefundEventConsumer(rmq rabbitmq.IRabbitMQ, hub *SSEHub) *RefundEventConsumer {
	return &RefundEventConsumer{
		rmq: rmq,
		hub: hub,
	}
}

// Start begins consuming refund request events from RabbitMQ.
// It blocks until the context is cancelled.
func (c *RefundEventConsumer) Start(ctx context.Context) {
	if c.rmq == nil {
		logger.Warn("RefundEventConsumer: RabbitMQ not available, skipping")
		return
	}

	msgs, err := c.rmq.Consume(QueueBookingRefundRequested)
	if err != nil {
		logger.Error("RefundEventConsumer: failed to start consuming: %v", err)
		return
	}

	logger.Info("RefundEventConsumer started (queue=%s)", QueueBookingRefundRequested)

	for {
		select {
		case <-ctx.Done():
			logger.Info("RefundEventConsumer stopped")
			return
		case msg, ok := <-msgs:
			if !ok {
				logger.Warn("RefundEventConsumer: channel closed")
				return
			}

			logger.Info("RefundEventConsumer: received refund event: %s", string(msg.Body))

			// Broadcast to all connected SSE admin clients
			c.hub.Broadcast(msg.Body)

			// Acknowledge the message
			if err := msg.Ack(false); err != nil {
				logger.Error("RefundEventConsumer: failed to ack message: %v", err)
			}
		}
	}
}
