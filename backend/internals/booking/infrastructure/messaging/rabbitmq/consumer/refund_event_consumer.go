package consumer

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math/rand"
	"time"

	"backend/internals/booking/infrastructure"
	"backend/pkgs/logger"
	"backend/pkgs/rabbitmq"
	"backend/pkgs/messaging"
	rmq_config "backend/pkgs/messaging/rabbitmq"

	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	consumerBackoffMin = 1 * time.Second
	consumerBackoffMax = 30 * time.Second
	maxDeliveryRetries = int64(5)
)

var ErrInvalidEnvelope = errors.New("invalid event envelope")

// RefundNotificationConsumer listens to RabbitMQ refund queues and broadcasts via SSE
type RefundNotificationConsumer struct {
	rmq rabbitmq.IRabbitMQ
	hub *infrastructure.SSEHub
}

func NewRefundNotificationConsumer(rmq rabbitmq.IRabbitMQ, hub *infrastructure.SSEHub) *RefundNotificationConsumer {
	return &RefundNotificationConsumer{rmq: rmq, hub: hub}
}

func (c *RefundNotificationConsumer) Start(ctx context.Context) {
	if c.rmq == nil {
		logger.Warn("RefundNotificationConsumer: RabbitMQ not available, skipping")
		return
	}

	queue := rmq_config.QueueAdminRefund
	logger.Info("RefundNotificationConsumer started listening to %s", queue)
	c.consumeWithRetry(ctx, queue)
	logger.Info("RefundNotificationConsumer stopped gracefully")
}

func (c *RefundNotificationConsumer) consumeWithRetry(ctx context.Context, queueName string) {
	attempt := 0
	for {
		if ctx.Err() != nil {
			return
		}

		consumer := c.rmq.NewConsumer(queueName)
		msgs, err := consumer.Consume()
		if err != nil {
			attempt++
			backoff := nextBackoff(attempt)
			logger.Error("RefundRMQConsumer: consume failed (queue=%s, attempt=%d): %v", queueName, attempt, err)
			
			select {
			case <-ctx.Done():
				return
			case <-time.After(backoff):
			}
			continue
		}

		attempt = 0
		logger.Info("RefundRMQConsumer connected (queue=%s)", queueName)

		if closed := c.consumeLoop(ctx, queueName, msgs); !closed {
			return
		}

		attempt++
		select {
		case <-ctx.Done():
			return
		case <-time.After(nextBackoff(attempt)):
		}
	}
}

func (c *RefundNotificationConsumer) consumeLoop(ctx context.Context, queueName string, msgs <-chan amqp.Delivery) bool {
	for {
		select {
		case <-ctx.Done():
			return false
		case msg, ok := <-msgs:
			if !ok {
				logger.Warn("RefundRMQConsumer: channel closed for queue: %s", queueName)
				return true
			}

			if err := c.handleMessage(msg.Body); err != nil {
				requeue := shouldRequeueMessage(msg, err)
				if nackErr := msg.Nack(false, requeue); nackErr != nil {
					logger.Error("RefundRMQConsumer: NACK failed: %v", nackErr)
				}
				continue
			}

			_ = msg.Ack(false)
		}
	}
}

func (c *RefundNotificationConsumer) handleMessage(body []byte) error {
	var envelope messaging.EventEnvelope
	if err := json.Unmarshal(body, &envelope); err != nil {
		return err
	}

	if envelope.EventType == "" || envelope.EventID == "" || len(envelope.Payload) == 0 {
		return fmt.Errorf("%w: missing required fields", ErrInvalidEnvelope)
	}

	c.hub.Broadcast(body)
	return nil
}

// Helper methods 

func shouldRequeueMessage(msg amqp.Delivery, err error) bool {
	if errors.Is(err, ErrInvalidEnvelope) {
		return false
	}
	return currentRetryCount(msg) < maxDeliveryRetries
}

func currentRetryCount(msg amqp.Delivery) int64 {
	xDeathRaw, ok := msg.Headers["x-death"]
	if !ok {
		return 0
	}
	xDeathList, ok := xDeathRaw.([]interface{})
	if !ok || len(xDeathList) == 0 {
		return 0
	}
	deathEntry, ok := xDeathList[0].(amqp.Table)
	if !ok {
		return 0
	}
	if countRaw, ok := deathEntry["count"]; ok {
		switch v := countRaw.(type) {
		case int64: return v
		case int32: return int64(v)
		case int: return int64(v)
		case float64: return int64(v)
		}
	}
	return 0
}

func nextBackoff(attempt int) time.Duration {
	if attempt < 1 {
		return consumerBackoffMin
	}
	backoff := consumerBackoffMin
	for i := 1; i < attempt; i++ {
		backoff *= 2
		if backoff >= consumerBackoffMax {
			backoff = consumerBackoffMax
			break
		}
	}
	jitterMax := int64(backoff / 5)
	if jitterMax > 0 {
		backoff += time.Duration(rand.Int63n(jitterMax))
	}
	if backoff > consumerBackoffMax {
		return consumerBackoffMax
	}
	return backoff
}
