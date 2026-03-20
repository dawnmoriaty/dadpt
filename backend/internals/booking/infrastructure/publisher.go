package infrastructure

import (
	"context"
	"encoding/json"
	"time"

	"backend/internals/booking/domain"
	"backend/pkgs/logger"
	"backend/pkgs/rabbitmq"

	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	BookingExchange = "booking.events"
	ExchangeKind    = "topic"

	QueueAdminBookingEvents = "admin.booking.events.queue"

	RoutingKeyCreated         = "booking.created"
	RoutingKeyPaid            = "booking.paid"
	RoutingKeyExpired         = "booking.expired"
	RoutingKeyCancelled       = "booking.cancelled"
	RoutingKeyRefundRequested = "booking.refund.requested"

	QueueBookingCreated         = "booking.created.queue"
	QueueBookingPaid            = "booking.paid.queue"
	QueueBookingExpired         = "booking.expired.queue"
	QueueBookingCancelled       = "booking.cancelled.queue"
	QueueBookingRefundRequested = "booking.refund.requested.queue"

	QueueAdminBookingEventsDLQ = "admin.booking.events.dlq"
	DLXName                    = "booking.events.dlx"
	DLXRoutingKey              = "booking.events.dead"
)

// BookingEvent is the message payload published to RabbitMQ
type BookingEvent struct {
	EventType string           `json:"eventType"`
	Timestamp time.Time        `json:"timestamp"`
	Booking   BookingEventData `json:"booking"`
}

// BookingEventData is a lightweight snapshot of the booking for events
type BookingEventData struct {
	ID            int64    `json:"id"`
	Code          string   `json:"code"`
	TripID        int64    `json:"tripId"`
	SeatCodes     []string `json:"seatCodes"`
	TotalAmount   float64  `json:"totalAmount"`
	Status        string   `json:"status"`
	PaymentMethod string   `json:"paymentMethod"`
}

type bookingEventPublisher struct {
	rmq rabbitmq.IRabbitMQ
}

// NewBookingEventPublisher creates a publisher that sends booking events to RabbitMQ.
// If rmq is nil, events are logged but not published (degraded mode).
func NewBookingEventPublisher(rmq rabbitmq.IRabbitMQ) domain.BookingEventPublisher {
	return &bookingEventPublisher{rmq: rmq}
}

func (p *bookingEventPublisher) PublishBookingCreated(ctx context.Context, booking *domain.Booking) error {
	return p.publish(ctx, RoutingKeyCreated, booking)
}

func (p *bookingEventPublisher) PublishBookingPaid(ctx context.Context, booking *domain.Booking) error {
	return p.publish(ctx, RoutingKeyPaid, booking)
}

func (p *bookingEventPublisher) PublishBookingExpired(ctx context.Context, booking *domain.Booking) error {
	return p.publish(ctx, RoutingKeyExpired, booking)
}

func (p *bookingEventPublisher) PublishBookingCancelled(ctx context.Context, booking *domain.Booking) error {
	return p.publish(ctx, RoutingKeyCancelled, booking)
}

func (p *bookingEventPublisher) PublishRefundRequested(ctx context.Context, booking *domain.Booking) error {
	return p.publish(ctx, RoutingKeyRefundRequested, booking)
}

func (p *bookingEventPublisher) publish(ctx context.Context, routingKey string, booking *domain.Booking) error {
	if p.rmq == nil {
		logger.Warn("RabbitMQ not available, skipping event: %s for booking %d", routingKey, booking.ID)
		return nil
	}

	event := BookingEvent{
		EventType: routingKey,
		Timestamp: time.Now(),
		Booking: BookingEventData{
			ID:            booking.ID,
			Code:          string(booking.Code),
			TripID:        booking.TripID,
			SeatCodes:     booking.SeatCodes,
			TotalAmount:   booking.TotalAmount,
			Status:        string(booking.Status),
			PaymentMethod: booking.PaymentMethod,
		},
	}

	if err := p.rmq.PublishJSON(ctx, BookingExchange, routingKey, event); err != nil {
		logger.Error("Failed to publish event %s: %v", routingKey, err)
		return err
	}

	logger.Info("Published event: %s for booking %s", routingKey, booking.Code)
	return nil
}

// SetupBookingTopology declares the exchange, queues, and bindings for the booking module.
func SetupBookingTopology(rmq rabbitmq.IRabbitMQ) error {
	if rmq == nil {
		logger.Warn("RabbitMQ not available, skipping topology setup")
		return nil
	}

	topologies := []struct {
		queue      string
		routingKey string
	}{
		{QueueBookingCreated, RoutingKeyCreated},
		{QueueBookingPaid, RoutingKeyPaid},
		{QueueBookingExpired, RoutingKeyExpired},
		{QueueBookingCancelled, RoutingKeyCancelled},
		{QueueBookingRefundRequested, RoutingKeyRefundRequested},
	}

	for _, t := range topologies {
		if err := rmq.SetupTopology(BookingExchange, ExchangeKind, t.queue, t.routingKey); err != nil {
			return err
		}
	}

	adminQueueArgs := amqp.Table{
		"x-dead-letter-exchange":    DLXName,
		"x-dead-letter-routing-key": DLXRoutingKey,
	}

	if err := rmq.SetupTopologyWithQueueArgs(BookingExchange, ExchangeKind, QueueAdminBookingEvents, "booking.*", adminQueueArgs); err != nil {
		return err
	}

	if err := rmq.SetupTopologyWithQueueArgs(BookingExchange, ExchangeKind, QueueAdminBookingEvents, "booking.refund.*", adminQueueArgs); err != nil {
		return err
	}

	if err := rmq.SetupTopology(DLXName, ExchangeKind, QueueAdminBookingEventsDLQ, DLXRoutingKey); err != nil {
		return err
	}

	logger.Info("Booking RabbitMQ topology set up successfully")
	return nil
}

// MarshalBookingEvent converts a booking to a JSON payload for the outbox table.
func MarshalBookingEvent(eventType string, booking *domain.Booking) ([]byte, error) {
	event := BookingEvent{
		EventType: eventType,
		Timestamp: time.Now(),
		Booking: BookingEventData{
			ID:            booking.ID,
			Code:          string(booking.Code),
			TripID:        booking.TripID,
			SeatCodes:     booking.SeatCodes,
			TotalAmount:   booking.TotalAmount,
			Status:        string(booking.Status),
			PaymentMethod: booking.PaymentMethod,
		},
	}
	return json.Marshal(event)
}
