package rmq_config

import (
	"backend/pkgs/logger"
	"backend/pkgs/rabbitmq"
	amqp "github.com/rabbitmq/amqp091-go"
)

// SetupRabbitMQTopology declares the system-wide exchanges, queues, and bindings.
func SetupRabbitMQTopology(rmq rabbitmq.IRabbitMQ) error {
	if rmq == nil {
		logger.Warn("RabbitMQ not available, skipping topology setup")
		return nil
	}

	adminQueueArgs := amqp.Table{
		"x-dead-letter-exchange":    ExchangeDLX,
		"x-dead-letter-routing-key": RoutingDLXDead,
	}

	// Booking Refund Queue Binding
	if err := rmq.SetupTopologyWithQueueArgs(ExchangeBooking, "topic", QueueAdminRefund, "booking.refund.*", adminQueueArgs); err != nil {
		return err
	}

	// Refund DLQ
	if err := rmq.SetupTopology(ExchangeDLX, "topic", QueueAdminRefundDLQ, RoutingDLXDead); err != nil {
		return err
	}

	logger.Info("RabbitMQ central topology set up successfully")
	return nil
}
