package infrastructure

import (
	"backend/pkgs/logger"
	"backend/pkgs/rabbitmq"

	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	BookingExchange = "booking.events"
	ExchangeKind    = "topic"

	QueueAdminRefundEvents = "admin.refund.events.queue"

	RoutingKeyRefundRequested = "booking.refund.requested"
	RoutingKeyRefundApproved  = "booking.refund.approved"
	RoutingKeyRefundRejected  = "booking.refund.rejected"

	QueueAdminRefundEventsDLQ = "admin.refund.events.dlq"
	DLXName                   = "booking.events.dlx"
	DLXRoutingKey             = "booking.events.dead"
)

func SetupRefundTopology(rmq rabbitmq.IRabbitMQ) error {
	if rmq == nil {
		logger.Warn("RabbitMQ not available, skipping topology setup")
		return nil
	}

	adminQueueArgs := amqp.Table{
		"x-dead-letter-exchange":    DLXName,
		"x-dead-letter-routing-key": DLXRoutingKey,
	}

	if err := rmq.SetupTopologyWithQueueArgs(BookingExchange, ExchangeKind, QueueAdminRefundEvents, "booking.refund.*", adminQueueArgs); err != nil {
		return err
	}

	if err := rmq.SetupTopology(DLXName, ExchangeKind, QueueAdminRefundEventsDLQ, DLXRoutingKey); err != nil {
		return err
	}

	logger.Info("Refund RabbitMQ topology set up successfully")
	return nil
}
