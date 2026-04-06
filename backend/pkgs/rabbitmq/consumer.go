package rabbitmq

import (
	amqp "github.com/rabbitmq/amqp091-go"
)

type IConsumer interface {
	Consume() (<-chan amqp.Delivery, error)
}

type consumer struct {
	ch    *amqp.Channel
	queue string
}

func (c *consumer) Consume() (<-chan amqp.Delivery, error) {
	return c.ch.Consume(c.queue, "", false, false, false, false, nil)
}
