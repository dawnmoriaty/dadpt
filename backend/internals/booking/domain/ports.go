package domain

import (
	"context"
	"time"
)

// Repository defines the interface for booking persistence
type Repository interface {
	Create(ctx context.Context, booking *Booking) (*Booking, error)
	GetByID(ctx context.Context, id int64) (*Booking, error)
	GetByCode(ctx context.Context, code BookingCode) (*Booking, error)
	ListByUser(ctx context.Context, userID int64, limit, offset int32) ([]*Booking, int64, error)
	UpdateStatus(ctx context.Context, id int64, status BookingStatus) (*Booking, error)
	GetExpiredPending(ctx context.Context, limit int32) ([]*Booking, error)
	MarkPaid(ctx context.Context, id int64) (*Booking, error)
	MarkExpired(ctx context.Context, id int64) (*Booking, error)
}

// TripLocker defines the interface for trip seat locking operations
type TripLocker interface {
	// LockTrip acquires a row lock on the trip (FOR UPDATE NOWAIT)
	LockTrip(ctx context.Context, tripID int64) (*TripSnapshot, error)
	// UpdateSeatsAtomic updates seats with optimistic locking
	UpdateSeatsAtomic(ctx context.Context, tripID int64, seatCodes []string, seatCount, version int32) error
	// ReleaseSeats releases seats when booking is cancelled/expired
	ReleaseSeats(ctx context.Context, tripID int64, seatCodes []string, seatCount int32) error
}

// OutboxRepository defines the interface for outbox event persistence
type OutboxRepository interface {
	CreateEvent(ctx context.Context, topic string, payload []byte) error
	GetPendingEvents(ctx context.Context, limit int32) ([]*OutboxEvent, error)
	MarkProcessed(ctx context.Context, eventID string) error
	MarkFailed(ctx context.Context, eventID string) error
}

// PaymentRepository defines the interface for payment transaction persistence
type PaymentRepository interface {
	CreateTransaction(ctx context.Context, tx *PaymentTransaction) (*PaymentTransaction, error)
	GetByOrderCode(ctx context.Context, orderCode string) (*PaymentTransaction, error)
	MarkSuccess(ctx context.Context, orderCode string, webhookData []byte) (*PaymentTransaction, error)
	MarkFailed(ctx context.Context, orderCode string, webhookData []byte) (*PaymentTransaction, error)
}

// BookingEventPublisher defines the interface for publishing booking events to message broker
type BookingEventPublisher interface {
	PublishBookingCreated(ctx context.Context, booking *Booking) error
	PublishBookingPaid(ctx context.Context, booking *Booking) error
	PublishBookingExpired(ctx context.Context, booking *Booking) error
}

// DistributedLock defines the interface for distributed locking
type DistributedLock interface {
	Acquire(ctx context.Context, key string, ttl time.Duration) (bool, error)
	Release(ctx context.Context, key string) error
}

// OutboxEvent represents an event in the outbox table
type OutboxEvent struct {
	ID         string
	Topic      string
	Payload    []byte
	Status     string
	RetryCount int32
	CreatedAt  time.Time
}
