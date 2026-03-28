package rabbitmq

import (
	"fmt"

	"backend/pkgs/logger"

	amqp "github.com/rabbitmq/amqp091-go"
)

// IRabbitMQ defines the broker operations acting as a factory for producers and consumers.
type IRabbitMQ interface {
	Close()

	// Factories
	NewProducer(exchange string) IProducer
	NewConsumer(queue string) IConsumer

	// Topology Operations
	SetupTopology(exchange, exchangeKind, queue, routingKey string) error
	SetupTopologyWithQueueArgs(exchange, exchangeKind, queue, routingKey string, args amqp.Table) error
	DeclareExchange(name, kind string) error
	DeclareQueueWithArgs(name string, args amqp.Table) (amqp.Queue, error)
	BindQueue(queue, exchange, routingKey string) error
}

type rabbitMQ struct {
	Conn    *amqp.Connection
	Channel *amqp.Channel
}

// NewRabbitMQ creates a connection and returns the interface.
func NewRabbitMQ(uri string) (IRabbitMQ, error) {
	conn, err := amqp.Dial(uri)
	if err != nil {
		return nil, fmt.Errorf("rabbitmq dial: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("rabbitmq channel: %w", err)
	}

	logger.Info("RabbitMQ connected")

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
	logger.Info("RabbitMQ closed")
}

func (r *rabbitMQ) NewProducer(exchange string) IProducer {
	return &producer{
		ch:       r.Channel,
		exchange: exchange,
	}
}

func (r *rabbitMQ) NewConsumer(queue string) IConsumer {
	return &consumer{
		ch:    r.Channel,
		queue: queue,
	}
}
