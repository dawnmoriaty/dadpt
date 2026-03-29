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
	ListActiveSeatCodesByUserTrip(ctx context.Context, userID int64, tripID int64) ([]string, error)
	ListActiveByTrip(ctx context.Context, tripID int64) ([]*Booking, error)
	ListByUser(ctx context.Context, userID int64, limit, offset int32) ([]*Booking, int64, error)
	ListAdmin(ctx context.Context, input *AdminBookingListInput) ([]*Booking, int64, error)
	GetAdminStats(ctx context.Context) (*AdminBookingStatsOutput, error)
	GetAdminRevenueSeries(ctx context.Context, days int32) ([]*AdminRevenueSeriesPoint, error)
	UpdateStatus(ctx context.Context, id int64, status BookingStatus) (*Booking, error)
	GetExpiredPending(ctx context.Context, limit int32) ([]*Booking, error)
	MarkPaid(ctx context.Context, id int64) (*Booking, error)
	MarkExpired(ctx context.Context, id int64) (*Booking, error)
	MarkRefundPending(ctx context.Context, id int64) (*Booking, error)
	MarkRefunded(ctx context.Context, id int64) (*Booking, error)
	MarkRefundedWithMeta(ctx context.Context, id int64, refundReference, refundNote string) (*Booking, error)
	ListRefundPending(ctx context.Context, limit, offset int32) ([]*Booking, int64, error)
	CountRefundPending(ctx context.Context) (int64, error)
	RevertToPaid(ctx context.Context, id int64) (*Booking, error)
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
	GetLatestByBookingID(ctx context.Context, bookingID int64) (*PaymentTransaction, error)
	GetPendingByBookingID(ctx context.Context, bookingID int64) (*PaymentTransaction, error)
	GetSuccessByBookingID(ctx context.Context, bookingID int64) (*PaymentTransaction, error)
	MarkSuccess(ctx context.Context, orderCode string, webhookData []byte) (*PaymentTransaction, error)
	MarkFailed(ctx context.Context, orderCode string, webhookData []byte) (*PaymentTransaction, error)
	MarkRefunded(ctx context.Context, bookingID int64) (*PaymentTransaction, error)
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
