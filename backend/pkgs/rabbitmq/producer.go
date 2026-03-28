package rabbitmq

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

// IProducer handles message publishing for a specific exchange.
type IProducer interface {
	PublishJSON(ctx context.Context, routingKey string, body interface{}) error
	PublishRaw(ctx context.Context, routingKey string, body []byte) error
}

type producer struct {
	ch       *amqp.Channel
	exchange string
}

func (p *producer) PublishJSON(ctx context.Context, routingKey string, body interface{}) error {
	data, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("marshal message: %w", err)
	}

	return p.PublishRaw(ctx, routingKey, data)
}

func (p *producer) PublishRaw(ctx context.Context, routingKey string, body []byte) error {
	return p.ch.PublishWithContext(ctx, p.exchange, routingKey, false, false, amqp.Publishing{
		ContentType:  "application/json",
		DeliveryMode: amqp.Persistent,
		Timestamp:    time.Now(),
		Body:         body,
	})
}
