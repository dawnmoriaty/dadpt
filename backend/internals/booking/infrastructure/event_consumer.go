package infrastructure

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math/rand"
	"time"

	"backend/internals/booking/domain"
	"backend/pkgs/logger"
	"backend/pkgs/rabbitmq"

	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	consumerBackoffMin = 1 * time.Second
	consumerBackoffMax = 30 * time.Second
	maxDeliveryRetries = int64(5)
)

var ErrInvalidEnvelope = errors.New("invalid event envelope")

type AdminBookingEventConsumer struct {
	rmq rabbitmq.IRabbitMQ
	hub *SSEHub
}

func NewAdminBookingEventConsumer(rmq rabbitmq.IRabbitMQ, hub *SSEHub) *AdminBookingEventConsumer {
	return &AdminBookingEventConsumer{rmq: rmq, hub: hub}
}

func (c *AdminBookingEventConsumer) Start(ctx context.Context) {
	if c.rmq == nil {
		logger.Warn("AdminBookingEventConsumer: RabbitMQ not available, skipping")
		return
	}

	logger.Info("AdminBookingEventConsumer started")
	c.consumeWithRetry(ctx, QueueAdminBookingEvents)
	logger.Info("AdminBookingEventConsumer stopped")
}

func (c *AdminBookingEventConsumer) consumeWithRetry(ctx context.Context, queueName string) {
	attempt := 0

	for {
		if ctx.Err() != nil {
			return
		}

		msgs, err := c.rmq.Consume(queueName)
		if err != nil {
			attempt++
			backoff := nextBackoff(attempt)
			logger.Error("AdminBookingEventConsumer: consume failed (queue=%s, attempt=%d): %v", queueName, attempt, err)
			logger.Warn("AdminBookingEventConsumer: retrying in %s", backoff)

			select {
			case <-ctx.Done():
				return
			case <-time.After(backoff):
			}
			continue
		}

		attempt = 0
		logger.Info("AdminBookingEventConsumer connected (queue=%s)", queueName)

		closed := c.consumeLoop(ctx, queueName, msgs)
		if !closed {
			return
		}

		attempt++
		backoff := nextBackoff(attempt)
		logger.Warn("AdminBookingEventConsumer: channel closed, retrying in %s", backoff)
		select {
		case <-ctx.Done():
			return
		case <-time.After(backoff):
		}
	}
}

func (c *AdminBookingEventConsumer) consumeLoop(ctx context.Context, queueName string, msgs <-chan amqp.Delivery) (channelClosed bool) {
	for {
		select {
		case <-ctx.Done():
			return false
		case msg, ok := <-msgs:
			if !ok {
				logger.Warn("AdminBookingEventConsumer: delivery channel closed (queue=%s)", queueName)
				return true
			}

			if err := c.handleMessage(msg.Body); err != nil {
				requeue := shouldRequeueMessage(msg, err)
				if requeue {
					logger.Warn("AdminBookingEventConsumer: transient handler error, requeue message (attempt=%d): %v", currentRetryCount(msg), err)
				} else {
					logger.Error("AdminBookingEventConsumer: message moved to DLQ (attempt=%d): %v", currentRetryCount(msg), err)
				}

				if nackErr := msg.Nack(false, requeue); nackErr != nil {
					logger.Error("AdminBookingEventConsumer: failed to nack message: %v", nackErr)
				}
				continue
			}

			if err := msg.Ack(false); err != nil {
				logger.Error("AdminBookingEventConsumer: failed to ack message: %v", err)
			}
		}
	}
}

func (c *AdminBookingEventConsumer) handleMessage(body []byte) error {
	var envelope domain.EventEnvelope
	if err := json.Unmarshal(body, &envelope); err != nil {
		return err
	}

	if envelope.EventType == "" || envelope.EventID == "" || len(envelope.Payload) == 0 {
		return fmt.Errorf("%w: missing required fields", ErrInvalidEnvelope)
	}

	c.hub.Broadcast(body)
	return nil
}

func shouldRequeueMessage(msg amqp.Delivery, err error) bool {
	if errors.Is(err, ErrInvalidEnvelope) {
		return false
	}
	if hasExceededRetries(msg, maxDeliveryRetries) {
		return false
	}
	return true
}

func hasExceededRetries(msg amqp.Delivery, maxRetries int64) bool {
	return currentRetryCount(msg) >= maxRetries
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

	countRaw, ok := deathEntry["count"]
	if !ok {
		return 0
	}

	switch v := countRaw.(type) {
	case int64:
		return v
	case int32:
		return int64(v)
	case int:
		return int64(v)
	case float64:
		return int64(v)
	default:
		return 0
	}
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
