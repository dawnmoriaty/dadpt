package rabbitmq

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"backend/pkgs/logger"

	amqp "github.com/rabbitmq/amqp091-go"
)

type IRabbitMQ interface {
	Close()
	DeclareQueue(name string) (amqp.Queue, error)
	DeclareQueueWithArgs(name string, args amqp.Table) (amqp.Queue, error)
	DeclareExchange(name, kind string) error
	BindQueue(queue, exchange, routingKey string) error
	PublishJSON(ctx context.Context, exchange, routingKey string, body interface{}) error
	PublishRaw(ctx context.Context, exchange, routingKey string, body []byte) error
	Consume(queue string) (<-chan amqp.Delivery, error)
	SetupTopology(exchange, exchangeKind, queue, routingKey string) error
	SetupTopologyWithQueueArgs(exchange, exchangeKind, queue, routingKey string, args amqp.Table) error
}

type rabbitMQ struct {
	Conn    *amqp.Connection
	Channel *amqp.Channel
}

func NewRabbitMQ(uri string) (IRabbitMQ, error) {
	conn, err := amqp.Dial(uri)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to open channel: %w", err)
	}

	logger.Info("RabbitMQ connection established")

	return &rabbitMQ{
		Conn:    conn,
		Channel: ch,
	}, nil
}

func (r *rabbitMQ) Close() {
	if r.Channel != nil {
		r.Channel.Close()
	}
	if r.Conn != nil {
		r.Conn.Close()
	}
	logger.Info("RabbitMQ connection closed")
}

func (r *rabbitMQ) DeclareQueue(name string) (amqp.Queue, error) {
	return r.Channel.QueueDeclare(name, true, false, false, false, nil)
}

func (r *rabbitMQ) DeclareQueueWithArgs(name string, args amqp.Table) (amqp.Queue, error) {
	return r.Channel.QueueDeclare(name, true, false, false, false, args)
}

func (r *rabbitMQ) DeclareExchange(name, kind string) error {
	return r.Channel.ExchangeDeclare(name, kind, true, false, false, false, nil)
}

// BindQueue binds a queue to an exchange with a routing key.
func (r *rabbitMQ) BindQueue(queue, exchange, routingKey string) error {
	return r.Channel.QueueBind(queue, routingKey, exchange, false, nil)
}

// PublishJSON publishes a JSON-encoded message to the given exchange with a routing key.
func (r *rabbitMQ) PublishJSON(ctx context.Context, exchange, routingKey string, body interface{}) error {
	data, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	return r.Channel.PublishWithContext(ctx, exchange, routingKey, false, false, amqp.Publishing{
		ContentType:  "application/json",
		DeliveryMode: amqp.Persistent,
		Timestamp:    time.Now(),
		Body:         data,
	})
}

// PublishRaw publishes a raw byte message to the given exchange with a routing key.
func (r *rabbitMQ) PublishRaw(ctx context.Context, exchange, routingKey string, body []byte) error {
	return r.Channel.PublishWithContext(ctx, exchange, routingKey, false, false, amqp.Publishing{
		ContentType:  "application/json",
		DeliveryMode: amqp.Persistent,
		Timestamp:    time.Now(),
		Body:         body,
	})
}

// Consume starts consuming messages from the given queue.
func (r *rabbitMQ) Consume(queue string) (<-chan amqp.Delivery, error) {
	return r.Channel.Consume(queue, "", false, false, false, false, nil)
}

// SetupTopology declares an exchange, a queue, and binds them.
func (r *rabbitMQ) SetupTopology(exchange, exchangeKind, queue, routingKey string) error {
	return r.SetupTopologyWithQueueArgs(exchange, exchangeKind, queue, routingKey, nil)
}

// SetupTopologyWithQueueArgs declares an exchange, a queue with args, and binds them.
func (r *rabbitMQ) SetupTopologyWithQueueArgs(exchange, exchangeKind, queue, routingKey string, args amqp.Table) error {
	if err := r.DeclareExchange(exchange, exchangeKind); err != nil {
		return fmt.Errorf("failed to declare exchange %s: %w", exchange, err)
	}

	if _, err := r.DeclareQueueWithArgs(queue, args); err != nil {
		return fmt.Errorf("failed to declare queue %s: %w", queue, err)
	}

	if err := r.BindQueue(queue, exchange, routingKey); err != nil {
		return fmt.Errorf("failed to bind queue %s to exchange %s: %w", queue, exchange, err)
	}

	return nil
}
