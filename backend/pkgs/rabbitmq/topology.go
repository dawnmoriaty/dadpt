package rabbitmq

import (
	"fmt"
	amqp "github.com/rabbitmq/amqp091-go"
)

func (r *rabbitMQ) DeclareExchange(name, kind string) error {
	return r.Channel.ExchangeDeclare(name, kind, true, false, false, false, nil)
}

func (r *rabbitMQ) DeclareQueueWithArgs(name string, args amqp.Table) (amqp.Queue, error) {
	return r.Channel.QueueDeclare(name, true, false, false, false, args)
}

func (r *rabbitMQ) BindQueue(queue, exchange, routingKey string) error {
	return r.Channel.QueueBind(queue, routingKey, exchange, false, nil)
}

func (r *rabbitMQ) SetupTopologyWithQueueArgs(exchange, exchangeKind, queue, routingKey string, args amqp.Table) error {
	if err := r.DeclareExchange(exchange, exchangeKind); err != nil {
		return fmt.Errorf("declare exchange %s: %w", exchange, err)
	}

	if _, err := r.DeclareQueueWithArgs(queue, args); err != nil {
		return fmt.Errorf("declare queue %s: %w", queue, err)
	}

	if err := r.BindQueue(queue, exchange, routingKey); err != nil {
		return fmt.Errorf("bind queue %s: %w", queue, err)
	}

	return nil
}

func (r *rabbitMQ) SetupTopology(exchange, exchangeKind, queue, routingKey string) error {
	return r.SetupTopologyWithQueueArgs(exchange, exchangeKind, queue, routingKey, nil)
}
