package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"backend/db"
	"backend/internals/booking/domain"
	"backend/pkgs/utils"
	"backend/sql/models"

	"github.com/jackc/pgx/v5"
)

type bookingRepository struct {
	db      *db.Database
	queries *models.Queries
}

// NewBookingRepository creates a new booking repository
func NewBookingRepository(database *db.Database) domain.Repository {
	return &bookingRepository{
		db:      database,
		queries: models.New(database.GetPool()),
	}
}

// =============================================================================
// MAPPERS
// =============================================================================

func sqlcToEntity(m models.Booking) *domain.Booking {
	return &domain.Booking{
		ID:              m.ID,
		Code:            domain.BookingCode(m.Code),
		TripID:          m.TripID,
		UserID:          m.UserID,
		GuestInfo:       jsonToGuestInfo(m.GuestInfo),
		PickupInfo:      jsonToPointInfo(m.PickupInfo),
		DropoffInfo:     jsonToPointInfo(m.DropoffInfo),
		SeatCodes:       m.SeatCodes,
		TotalAmount:     utils.NumericToFloat64(m.TotalAmount),
		Status:          domain.BookingStatus(utils.PtrToString(m.Status)),
		PaymentMethod:   utils.PtrToString(m.PaymentMethod),
		ExpiresAt:       m.ExpiresAt.Time,
		RefundedAt:      m.RefundedAt.Time,
		RefundReference: utils.PtrToString(m.RefundReference),
		RefundNote:      utils.PtrToString(m.RefundNote),
		CreatedAt:       m.CreatedAt.Time,
		UpdatedAt:       m.UpdatedAt.Time,
	}
}

func listRowToEntity(m models.ListBookingsByUserRow) *domain.Booking {
	return &domain.Booking{
		ID:              m.ID,
		Code:            domain.BookingCode(m.Code),
		TripID:          m.TripID,
		UserID:          m.UserID,
		GuestInfo:       jsonToGuestInfo(m.GuestInfo),
		PickupInfo:      jsonToPointInfo(m.PickupInfo),
		DropoffInfo:     jsonToPointInfo(m.DropoffInfo),
		SeatCodes:       m.SeatCodes,
		TotalAmount:     utils.NumericToFloat64(m.TotalAmount),
		Status:          domain.BookingStatus(utils.PtrToString(m.Status)),
		PaymentMethod:   utils.PtrToString(m.PaymentMethod),
		ExpiresAt:       m.ExpiresAt.Time,
		RefundedAt:      m.RefundedAt.Time,
		RefundReference: utils.PtrToString(m.RefundReference),
		RefundNote:      utils.PtrToString(m.RefundNote),
		CreatedAt:       m.CreatedAt.Time,
		UpdatedAt:       m.UpdatedAt.Time,
		DepartureTime:   m.DepartureTime.Time,
		ArrivalTime:     m.ArrivalTime.Time,
		OriginName:      m.OriginName,
		DestinationName: m.DestinationName,
	}
}

func refundPendingRowToEntity(m models.ListRefundPendingBookingsRow) *domain.Booking {
	return &domain.Booking{
		ID:              m.ID,
		Code:            domain.BookingCode(m.Code),
		TripID:          m.TripID,
		UserID:          m.UserID,
		GuestInfo:       jsonToGuestInfo(m.GuestInfo),
		PickupInfo:      jsonToPointInfo(m.PickupInfo),
		DropoffInfo:     jsonToPointInfo(m.DropoffInfo),
		SeatCodes:       m.SeatCodes,
		TotalAmount:     utils.NumericToFloat64(m.TotalAmount),
		Status:          domain.BookingStatus(utils.PtrToString(m.Status)),
		PaymentMethod:   utils.PtrToString(m.PaymentMethod),
		ExpiresAt:       m.ExpiresAt.Time,
		RefundedAt:      m.RefundedAt.Time,
		RefundReference: utils.PtrToString(m.RefundReference),
		RefundNote:      utils.PtrToString(m.RefundNote),
		CreatedAt:       m.CreatedAt.Time,
		UpdatedAt:       m.UpdatedAt.Time,
		DepartureTime:   m.DepartureTime.Time,
		ArrivalTime:     m.ArrivalTime.Time,
		OriginName:      m.OriginName,
		DestinationName: m.DestinationName,
	}
}

func adminListRowToEntity(m models.ListAdminBookingsRow) *domain.Booking {
	return &domain.Booking{
		ID:              m.ID,
		Code:            domain.BookingCode(m.Code),
		TripID:          m.TripID,
		UserID:          m.UserID,
		GuestInfo:       jsonToGuestInfo(m.GuestInfo),
		PickupInfo:      jsonToPointInfo(m.PickupInfo),
		DropoffInfo:     jsonToPointInfo(m.DropoffInfo),
		SeatCodes:       m.SeatCodes,
		TotalAmount:     utils.NumericToFloat64(m.TotalAmount),
		Status:          domain.BookingStatus(utils.PtrToString(m.Status)),
		PaymentMethod:   utils.PtrToString(m.PaymentMethod),
		ExpiresAt:       m.ExpiresAt.Time,
		RefundedAt:      m.RefundedAt.Time,
		RefundReference: utils.PtrToString(m.RefundReference),
		RefundNote:      utils.PtrToString(m.RefundNote),
		CreatedAt:       m.CreatedAt.Time,
		UpdatedAt:       m.UpdatedAt.Time,
		DepartureTime:   m.DepartureTime.Time,
		ArrivalTime:     m.ArrivalTime.Time,
		OriginName:      m.OriginName,
		DestinationName: m.DestinationName,
	}
}

func activeTripRowToEntity(m models.ListActiveBookingsByTripRow) *domain.Booking {
	return &domain.Booking{
		ID:              m.ID,
		Code:            domain.BookingCode(m.Code),
		TripID:          m.TripID,
		UserID:          m.UserID,
		GuestInfo:       jsonToGuestInfo(m.GuestInfo),
		PickupInfo:      jsonToPointInfo(m.PickupInfo),
		DropoffInfo:     jsonToPointInfo(m.DropoffInfo),
		SeatCodes:       m.SeatCodes,
		TotalAmount:     utils.NumericToFloat64(m.TotalAmount),
		Status:          domain.BookingStatus(utils.PtrToString(m.Status)),
		PaymentMethod:   utils.PtrToString(m.PaymentMethod),
		ExpiresAt:       m.ExpiresAt.Time,
		RefundedAt:      m.RefundedAt.Time,
		RefundReference: utils.PtrToString(m.RefundReference),
		RefundNote:      utils.PtrToString(m.RefundNote),
		CreatedAt:       m.CreatedAt.Time,
		UpdatedAt:       m.UpdatedAt.Time,
		DepartureTime:   m.DepartureTime.Time,
		ArrivalTime:     m.ArrivalTime.Time,
		OriginName:      m.OriginName,
		DestinationName: m.DestinationName,
	}
}

func jsonToGuestInfo(data json.RawMessage) domain.GuestInfo {
	var info domain.GuestInfo
	json.Unmarshal(data, &info)
	return info
}

func jsonToPointInfo(data json.RawMessage) domain.PointInfo {
	var info domain.PointInfo
	json.Unmarshal(data, &info)
	return info
}

func guestInfoToJSON(info domain.GuestInfo) json.RawMessage {
	data, _ := json.Marshal(info)
	return data
}

func pointInfoToJSON(info domain.PointInfo) json.RawMessage {
	data, _ := json.Marshal(info)
	return data
}

// =============================================================================
// REPOSITORY IMPLEMENTATION
// =============================================================================

func (r *bookingRepository) Create(ctx context.Context, booking *domain.Booking) (*domain.Booking, error) {
	result, err := r.queries.CreateBookingWithExpiry(ctx, models.CreateBookingWithExpiryParams{
		Code:          string(booking.Code),
		TripID:        booking.TripID,
		UserID:        booking.UserID,
		GuestInfo:     guestInfoToJSON(booking.GuestInfo),
		PickupInfo:    pointInfoToJSON(booking.PickupInfo),
		DropoffInfo:   pointInfoToJSON(booking.DropoffInfo),
		SeatCodes:     booking.SeatCodes,
		TotalAmount:   utils.Float64ToNumeric(booking.TotalAmount),
		PaymentMethod: utils.StringToPtr(booking.PaymentMethod),
		ExpiresAt:     utils.TimeToTimestamptz(booking.ExpiresAt),
	})
	if err != nil {
		return nil, fmt.Errorf("creating booking: %w", err)
	}
	return sqlcToEntity(result), nil
}

func (r *bookingRepository) GetByID(ctx context.Context, id int64) (*domain.Booking, error) {
	result, err := r.queries.GetBookingByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrBookingNotFound
		}
		return nil, fmt.Errorf("getting booking by id: %w", err)
	}
	return sqlcToEntity(result), nil
}

func (r *bookingRepository) GetByCode(ctx context.Context, code domain.BookingCode) (*domain.Booking, error) {
	result, err := r.queries.GetBookingByCode(ctx, string(code))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrBookingNotFound
		}
		return nil, fmt.Errorf("getting booking by code: %w", err)
	}
	return sqlcToEntity(result), nil
}

func (r *bookingRepository) ListActiveSeatCodesByUserTrip(ctx context.Context, userID int64, tripID int64) ([]string, error) {
	seatCodes, err := r.queries.ListActiveSeatCodesByUserTrip(ctx, models.ListActiveSeatCodesByUserTripParams{
		UserID: &userID,
		TripID: tripID,
	})
	if err != nil {
		return nil, fmt.Errorf("listing active seat codes by user trip: %w", err)
	}
	return seatCodes, nil
}

func (r *bookingRepository) ListByUser(ctx context.Context, userID int64, limit, offset int32) ([]*domain.Booking, int64, error) {
	rows, err := r.queries.ListBookingsByUser(ctx, models.ListBookingsByUserParams{
		UserID: &userID,
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return nil, 0, fmt.Errorf("listing bookings: %w", err)
	}

	count, err := r.queries.CountBookingsByUser(ctx, &userID)
	if err != nil {
		return nil, 0, fmt.Errorf("counting bookings: %w", err)
	}

	result := make([]*domain.Booking, len(rows))
	for i, row := range rows {
		result[i] = listRowToEntity(row)
	}

	return result, count, nil
}

func (r *bookingRepository) ListActiveByTrip(ctx context.Context, tripID int64) ([]*domain.Booking, error) {
	rows, err := r.queries.ListActiveBookingsByTrip(ctx, tripID)
	if err != nil {
		return nil, fmt.Errorf("listing active bookings by trip: %w", err)
	}

	result := make([]*domain.Booking, len(rows))
	for i, row := range rows {
		result[i] = activeTripRowToEntity(row)
	}

	return result, nil
}

func (r *bookingRepository) ListAdmin(ctx context.Context, input *domain.AdminBookingListInput) ([]*domain.Booking, int64, error) {
	rows, err := r.queries.ListAdminBookings(ctx, models.ListAdminBookingsParams{
		Column1: input.Status,
		Column2: input.TripID,
		Column3: input.Search,
		Limit:   input.Limit,
		Offset:  input.Offset,
	})
	if err != nil {
		return nil, 0, fmt.Errorf("listing admin bookings: %w", err)
	}

	count, err := r.queries.CountAdminBookings(ctx, models.CountAdminBookingsParams{
		Column1: input.Status,
		Column2: input.TripID,
		Column3: input.Search,
	})
	if err != nil {
		return nil, 0, fmt.Errorf("counting admin bookings: %w", err)
	}

	result := make([]*domain.Booking, len(rows))
	for i, row := range rows {
		result[i] = adminListRowToEntity(row)
	}

	return result, count, nil
}

func (r *bookingRepository) GetAdminStats(ctx context.Context) (*domain.AdminBookingStatsOutput, error) {
	row, err := r.queries.GetAdminBookingStats(ctx)
	if err != nil {
		return nil, fmt.Errorf("getting admin booking stats: %w", err)
	}

	return &domain.AdminBookingStatsOutput{
		TotalBookings:         row.TotalBookings,
		UnpaidBookings:        row.UnpaidBookings,
		PaidBookings:          row.PaidBookings,
		RefundPendingBookings: row.RefundPendingBookings,
		CancelledBookings:     row.CancelledBookings,
		PaidRevenue:           utils.NumericToFloat64(row.PaidRevenue),
		UnpaidRevenue:         utils.NumericToFloat64(row.UnpaidRevenue),
		ActiveTripCount:       row.ActiveTripCount,
	}, nil
}

func (r *bookingRepository) GetAdminRevenueSeries(ctx context.Context, days int32) ([]*domain.AdminRevenueSeriesPoint, error) {
	rows, err := r.queries.GetAdminBookingRevenueSeries(ctx, days)
	if err != nil {
		return nil, fmt.Errorf("getting admin revenue series: %w", err)
	}

	items := make([]*domain.AdminRevenueSeriesPoint, len(rows))
	for i, row := range rows {
		dateValue := ""
		if row.Day.Valid {
			dateValue = row.Day.Time.Format("2006-01-02")
		}
		items[i] = &domain.AdminRevenueSeriesPoint{
			Date:           dateValue,
			TotalBookings:  row.TotalBookings,
			PaidBookings:   row.PaidBookings,
			UnpaidBookings: row.UnpaidBookings,
			PaidRevenue:    utils.NumericToFloat64(row.PaidRevenue),
		}
	}

	return items, nil
}

func (r *bookingRepository) UpdateStatus(ctx context.Context, id int64, status domain.BookingStatus) (*domain.Booking, error) {
	s := string(status)
	result, err := r.queries.UpdateBookingStatus(ctx, models.UpdateBookingStatusParams{
		ID:     id,
		Status: &s,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrBookingNotFound
		}
		return nil, fmt.Errorf("updating booking status: %w", err)
	}
	return sqlcToEntity(result), nil
}

func (r *bookingRepository) GetExpiredPending(ctx context.Context, limit int32) ([]*domain.Booking, error) {
	rows, err := r.queries.GetExpiredPendingBookings(ctx, limit)
	if err != nil {
		return nil, fmt.Errorf("getting expired bookings: %w", err)
	}

	result := make([]*domain.Booking, len(rows))
	for i, row := range rows {
		result[i] = sqlcToEntity(row)
	}
	return result, nil
}

func (r *bookingRepository) MarkPaid(ctx context.Context, id int64) (*domain.Booking, error) {
	result, err := r.queries.MarkBookingPaid(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrBookingNotPending
		}
		return nil, fmt.Errorf("marking booking paid: %w", err)
	}
	return sqlcToEntity(result), nil
}

func (r *bookingRepository) MarkExpired(ctx context.Context, id int64) (*domain.Booking, error) {
	result, err := r.queries.MarkBookingExpired(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrBookingNotPending
		}
		return nil, fmt.Errorf("marking booking expired: %w", err)
	}
	return sqlcToEntity(result), nil
}

func (r *bookingRepository) MarkRefunded(ctx context.Context, id int64) (*domain.Booking, error) {
	result, err := r.queries.MarkBookingRefunded(ctx, models.MarkBookingRefundedParams{
		ID: id,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrBookingNotRefundPending
		}
		return nil, fmt.Errorf("marking booking refunded: %w", err)
	}
	return sqlcToEntity(result), nil
}

func (r *bookingRepository) MarkRefundedWithMeta(ctx context.Context, id int64, refundReference, refundNote string) (*domain.Booking, error) {
	result, err := r.queries.MarkBookingRefunded(ctx, models.MarkBookingRefundedParams{
		ID:              id,
		RefundReference: utils.StringToPtr(refundReference),
		RefundNote:      utils.StringToPtr(refundNote),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrBookingNotRefundPending
		}
		return nil, fmt.Errorf("marking booking refunded with meta: %w", err)
	}
	return sqlcToEntity(result), nil
}

func (r *bookingRepository) MarkRefundPending(ctx context.Context, id int64) (*domain.Booking, error) {
	result, err := r.queries.MarkBookingRefundPending(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrBookingNotPaid
		}
		return nil, fmt.Errorf("marking booking refund pending: %w", err)
	}
	return sqlcToEntity(result), nil
}

func (r *bookingRepository) ListRefundPending(ctx context.Context, limit, offset int32) ([]*domain.Booking, int64, error) {
	rows, err := r.queries.ListRefundPendingBookings(ctx, models.ListRefundPendingBookingsParams{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return nil, 0, fmt.Errorf("listing refund pending bookings: %w", err)
	}

	count, err := r.queries.CountRefundPendingBookings(ctx)
	if err != nil {
		return nil, 0, fmt.Errorf("counting refund pending bookings: %w", err)
	}

	result := make([]*domain.Booking, len(rows))
	for i, row := range rows {
		result[i] = refundPendingRowToEntity(row)
	}
	return result, count, nil
}

func (r *bookingRepository) CountRefundPending(ctx context.Context) (int64, error) {
	count, err := r.queries.CountRefundPendingBookings(ctx)
	if err != nil {
		return 0, fmt.Errorf("counting refund pending bookings: %w", err)
	}
	return count, nil
}

func (r *bookingRepository) RevertToPaid(ctx context.Context, id int64) (*domain.Booking, error) {
	result, err := r.queries.RevertBookingToPaid(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrBookingNotRefundPending
		}
		return nil, fmt.Errorf("reverting booking to paid: %w", err)
	}
	return sqlcToEntity(result), nil
}
