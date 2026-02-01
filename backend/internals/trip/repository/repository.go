package repository

import (
	"context"
	"encoding/json"

	"backend/db"
	"backend/internals/trip/domain"
	"backend/pkgs/errors"
	"backend/sql/models"

	"github.com/jackc/pgx/v5/pgtype"
)

type tripRepository struct {
	db      *db.Database
	queries *models.Queries
}

func NewTripRepository(database *db.Database) domain.Repository {
	return &tripRepository{
		db:      database,
		queries: models.New(database.GetPool()),
	}
}

// Mappers

func sqlcToEntity(m models.Trip) *domain.Trip {
	return &domain.Trip{
		ID:             m.ID,
		ProviderID:     m.ProviderID,
		BusID:          m.BusID,
		OriginID:       m.OriginID,
		DestinationID:  m.DestinationID,
		DepartureTime:  m.DepartureTime.Time,
		ArrivalTime:    m.ArrivalTime.Time,
		BasePrice:      numericToFloat(m.BasePrice),
		PriceModifier:  numericToFloat(m.PriceModifier),
		IsHotDeal:      ptrToBool(m.IsHotDeal),
		PickupPoints:   jsonToPoints(m.PickupPoints),
		DropoffPoints:  jsonToPoints(m.DropoffPoints),
		BookedSeats:    m.BookedSeats,
		AvailableSeats: m.AvailableSeats,
		Status:         domain.TripStatus(ptrToString(m.Status)),
		CreatedAt:      m.CreatedAt.Time,
	}
}

func searchRowToEntity(m models.SearchTripsRow) *domain.Trip {
	return &domain.Trip{
		ID:              m.ID,
		ProviderID:      m.ProviderID,
		BusID:           m.BusID,
		OriginID:        m.OriginID,
		DestinationID:   m.DestinationID,
		DepartureTime:   m.DepartureTime.Time,
		ArrivalTime:     m.ArrivalTime.Time,
		BasePrice:       numericToFloat(m.BasePrice),
		PriceModifier:   numericToFloat(m.PriceModifier),
		IsHotDeal:       ptrToBool(m.IsHotDeal),
		PickupPoints:    jsonToPoints(m.PickupPoints),
		DropoffPoints:   jsonToPoints(m.DropoffPoints),
		BookedSeats:     m.BookedSeats,
		AvailableSeats:  m.AvailableSeats,
		Status:          domain.TripStatus(ptrToString(m.Status)),
		CreatedAt:       m.CreatedAt.Time,
		ProviderName:    m.ProviderName,
		OriginName:      m.OriginName,
		OriginCity:      m.OriginCity,
		DestinationName: m.DestinationName,
		DestinationCity: m.DestinationCity,
	}
}

func listAdminRowToEntity(m models.ListTripsAdminRow) *domain.Trip {
	return &domain.Trip{
		ID:              m.ID,
		ProviderID:      m.ProviderID,
		BusID:           m.BusID,
		OriginID:        m.OriginID,
		DestinationID:   m.DestinationID,
		DepartureTime:   m.DepartureTime.Time,
		ArrivalTime:     m.ArrivalTime.Time,
		BasePrice:       numericToFloat(m.BasePrice),
		PriceModifier:   numericToFloat(m.PriceModifier),
		IsHotDeal:       ptrToBool(m.IsHotDeal),
		PickupPoints:    jsonToPoints(m.PickupPoints),
		DropoffPoints:   jsonToPoints(m.DropoffPoints),
		BookedSeats:     m.BookedSeats,
		AvailableSeats:  m.AvailableSeats,
		Status:          domain.TripStatus(ptrToString(m.Status)),
		CreatedAt:       m.CreatedAt.Time,
		ProviderName:    m.ProviderName,
		OriginName:      m.OriginName,
		OriginCity:      m.OriginCity,
		DestinationName: m.DestinationName,
		DestinationCity: m.DestinationCity,
	}
}

func numericToFloat(n pgtype.Numeric) float64 {
	f, _ := n.Float64Value()
	return f.Float64
}

func ptrToBool(b *bool) bool {
	if b == nil {
		return false
	}
	return *b
}

func ptrToString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func stringToPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func boolToPtr(b bool) *bool {
	return &b
}

func jsonToPoints(data json.RawMessage) []domain.Point {
	if data == nil {
		return nil
	}
	var points []domain.Point
	json.Unmarshal(data, &points)
	return points
}

func pointsToJSON(points []domain.Point) json.RawMessage {
	if points == nil {
		return nil
	}
	data, _ := json.Marshal(points)
	return data
}

func floatToNumeric(f float64) pgtype.Numeric {
	var n pgtype.Numeric
	n.Scan(f)
	return n
}

func timeToTimestamptz(t interface{}) pgtype.Timestamptz {
	var ts pgtype.Timestamptz
	ts.Scan(t)
	return ts
}

// Repository implementations

func (r *tripRepository) Create(ctx context.Context, trip *domain.Trip) (*domain.Trip, error) {
	result, err := r.queries.CreateTrip(ctx, models.CreateTripParams{
		ProviderID:     trip.ProviderID,
		BusID:          trip.BusID,
		OriginID:       trip.OriginID,
		DestinationID:  trip.DestinationID,
		DepartureTime:  timeToTimestamptz(trip.DepartureTime),
		ArrivalTime:    timeToTimestamptz(trip.ArrivalTime),
		BasePrice:      floatToNumeric(trip.BasePrice),
		PriceModifier:  floatToNumeric(trip.PriceModifier),
		IsHotDeal:      boolToPtr(trip.IsHotDeal),
		PickupPoints:   pointsToJSON(trip.PickupPoints),
		DropoffPoints:  pointsToJSON(trip.DropoffPoints),
		AvailableSeats: trip.AvailableSeats,
	})
	if err != nil {
		return nil, errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to create trip")
	}
	return sqlcToEntity(result), nil
}

func (r *tripRepository) GetByID(ctx context.Context, id int64) (*domain.Trip, error) {
	result, err := r.queries.GetTripByID(ctx, id)
	if err != nil {
		return nil, errors.ErrTripNotFound
	}
	return sqlcToEntity(result), nil
}

func (r *tripRepository) Update(ctx context.Context, trip *domain.Trip) (*domain.Trip, error) {
	result, err := r.queries.UpdateTrip(ctx, models.UpdateTripParams{
		ID:            trip.ID,
		DepartureTime: timeToTimestamptz(trip.DepartureTime),
		ArrivalTime:   timeToTimestamptz(trip.ArrivalTime),
		BasePrice:     floatToNumeric(trip.BasePrice),
		PriceModifier: floatToNumeric(trip.PriceModifier),
		IsHotDeal:     boolToPtr(trip.IsHotDeal),
		PickupPoints:  pointsToJSON(trip.PickupPoints),
		DropoffPoints: pointsToJSON(trip.DropoffPoints),
	})
	if err != nil {
		return nil, errors.ErrTripNotFound
	}
	return sqlcToEntity(result), nil
}

func (r *tripRepository) UpdateStatus(ctx context.Context, id int64, status domain.TripStatus) (*domain.Trip, error) {
	s := string(status)
	result, err := r.queries.UpdateTripStatus(ctx, models.UpdateTripStatusParams{
		ID:     id,
		Status: &s,
	})
	if err != nil {
		return nil, errors.ErrTripNotFound
	}
	return sqlcToEntity(result), nil
}

func (r *tripRepository) Delete(ctx context.Context, id int64) error {
	err := r.queries.DeleteTrip(ctx, id)
	if err != nil {
		return errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to delete trip")
	}
	return nil
}

func (r *tripRepository) List(ctx context.Context, filter *domain.TripFilter) ([]*domain.Trip, int64, error) {
	// Default values for optional filters (SQLC uses non-pointer types)
	var providerID int32 = 0
	var status string = ""
	if filter.ProviderID != nil {
		providerID = *filter.ProviderID
	}
	if filter.Status != nil {
		status = string(*filter.Status)
	}

	rows, err := r.queries.ListTripsAdmin(ctx, models.ListTripsAdminParams{
		Column1: providerID,
		Column2: status,
		Limit:   filter.Limit,
		Offset:  filter.Offset,
	})
	if err != nil {
		return nil, 0, errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to list trips")
	}

	count, err := r.queries.CountTripsAdmin(ctx, models.CountTripsAdminParams{
		Column1: providerID,
		Column2: status,
	})
	if err != nil {
		return nil, 0, errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to count trips")
	}

	result := make([]*domain.Trip, len(rows))
	for i, row := range rows {
		result[i] = listAdminRowToEntity(row)
	}

	return result, count, nil
}

func (r *tripRepository) Search(ctx context.Context, filter *domain.TripFilter) ([]*domain.Trip, int64, error) {
	if filter.OriginID == nil || filter.DestinationID == nil || filter.DepartureDate == nil {
		return nil, 0, errors.ValidationError("origin, destination and departure date are required")
	}

	rows, err := r.queries.SearchTrips(ctx, models.SearchTripsParams{
		OriginID:       *filter.OriginID,
		DestinationID:  *filter.DestinationID,
		DepartureTime:  timeToTimestamptz(*filter.DepartureDate),
		AvailableSeats: filter.MinSeats,
		Limit:          filter.Limit,
		Offset:         filter.Offset,
	})
	if err != nil {
		return nil, 0, errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to search trips")
	}

	count, err := r.queries.CountSearchTrips(ctx, models.CountSearchTripsParams{
		OriginID:       *filter.OriginID,
		DestinationID:  *filter.DestinationID,
		DepartureTime:  timeToTimestamptz(*filter.DepartureDate),
		AvailableSeats: filter.MinSeats,
	})
	if err != nil {
		return nil, 0, errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to count search trips")
	}

	result := make([]*domain.Trip, len(rows))
	for i, row := range rows {
		result[i] = searchRowToEntity(row)
	}

	return result, count, nil
}
