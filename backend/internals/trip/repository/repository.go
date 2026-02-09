package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"backend/db"
	"backend/internals/trip/domain"
	"backend/pkgs/utils"
	"backend/sql/models"
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
		BasePrice:      utils.NumericToFloat64(m.BasePrice),
		PriceModifier:  utils.NumericToFloat64(m.PriceModifier),
		IsHotDeal:      utils.PtrToBool(m.IsHotDeal),
		PickupPoints:   jsonToPoints(m.PickupPoints),
		DropoffPoints:  jsonToPoints(m.DropoffPoints),
		BookedSeats:    m.BookedSeats,
		AvailableSeats: m.AvailableSeats,
		Status:         domain.TripStatus(utils.PtrToString(m.Status)),
		CreatedAt:      m.CreatedAt.Time,
	}
}

func getByIDRowToEntity(m models.GetTripByIDRow) *domain.Trip {
	return &domain.Trip{
		ID:              m.ID,
		ProviderID:      m.ProviderID,
		BusID:           m.BusID,
		OriginID:        m.OriginID,
		DestinationID:   m.DestinationID,
		DepartureTime:   m.DepartureTime.Time,
		ArrivalTime:     m.ArrivalTime.Time,
		BasePrice:       utils.NumericToFloat64(m.BasePrice),
		PriceModifier:   utils.NumericToFloat64(m.PriceModifier),
		IsHotDeal:       utils.PtrToBool(m.IsHotDeal),
		PickupPoints:    jsonToPoints(m.PickupPoints),
		DropoffPoints:   jsonToPoints(m.DropoffPoints),
		BookedSeats:     m.BookedSeats,
		AvailableSeats:  m.AvailableSeats,
		Status:          domain.TripStatus(utils.PtrToString(m.Status)),
		CreatedAt:       m.CreatedAt.Time,
		ProviderName:    m.ProviderName,
		OriginName:      m.OriginName,
		OriginCity:      m.OriginCity,
		DestinationName: m.DestinationName,
		DestinationCity: m.DestinationCity,
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
		BasePrice:       utils.NumericToFloat64(m.BasePrice),
		PriceModifier:   utils.NumericToFloat64(m.PriceModifier),
		IsHotDeal:       utils.PtrToBool(m.IsHotDeal),
		PickupPoints:    jsonToPoints(m.PickupPoints),
		DropoffPoints:   jsonToPoints(m.DropoffPoints),
		BookedSeats:     m.BookedSeats,
		AvailableSeats:  m.AvailableSeats,
		Status:          domain.TripStatus(utils.PtrToString(m.Status)),
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
		BasePrice:       utils.NumericToFloat64(m.BasePrice),
		PriceModifier:   utils.NumericToFloat64(m.PriceModifier),
		IsHotDeal:       utils.PtrToBool(m.IsHotDeal),
		PickupPoints:    jsonToPoints(m.PickupPoints),
		DropoffPoints:   jsonToPoints(m.DropoffPoints),
		BookedSeats:     m.BookedSeats,
		AvailableSeats:  m.AvailableSeats,
		Status:          domain.TripStatus(utils.PtrToString(m.Status)),
		CreatedAt:       m.CreatedAt.Time,
		ProviderName:    m.ProviderName,
		OriginName:      m.OriginName,
		OriginCity:      m.OriginCity,
		DestinationName: m.DestinationName,
		DestinationCity: m.DestinationCity,
	}
}

// Domain-specific JSON converters (keep local - depends on domain.Point)
func jsonToPoints(data json.RawMessage) []domain.Point {
	if data == nil {
		return nil
	}
	var points []domain.Point
	json.Unmarshal(data, &points)
	return points
}

func pointsToJSON(points []domain.Point) json.RawMessage {
	if len(points) == 0 {
		return json.RawMessage("[]")
	}
	data, _ := json.Marshal(points)
	return data
}

// Repository implementations

func (r *tripRepository) Create(ctx context.Context, trip *domain.Trip) (*domain.Trip, error) {
	result, err := r.queries.CreateTrip(ctx, models.CreateTripParams{
		ProviderID:     trip.ProviderID,
		BusID:          trip.BusID,
		OriginID:       trip.OriginID,
		DestinationID:  trip.DestinationID,
		DepartureTime:  utils.TimeToTimestamptz(trip.DepartureTime),
		ArrivalTime:    utils.TimeToTimestamptz(trip.ArrivalTime),
		BasePrice:      utils.Float64ToNumeric(trip.BasePrice),
		PriceModifier:  utils.Float64ToNumeric(trip.PriceModifier),
		IsHotDeal:      utils.BoolToPtr(trip.IsHotDeal),
		PickupPoints:   pointsToJSON(trip.PickupPoints),
		DropoffPoints:  pointsToJSON(trip.DropoffPoints),
		AvailableSeats: trip.AvailableSeats,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create trip: %w", err)
	}
	return sqlcToEntity(result), nil
}

func (r *tripRepository) GetByID(ctx context.Context, id int64) (*domain.Trip, error) {
	result, err := r.queries.GetTripByID(ctx, id)
	if err != nil {
		return nil, domain.ErrTripNotFound
	}
	return getByIDRowToEntity(result), nil
}

func (r *tripRepository) Update(ctx context.Context, trip *domain.Trip) (*domain.Trip, error) {
	result, err := r.queries.UpdateTrip(ctx, models.UpdateTripParams{
		ID:             trip.ID,
		DepartureTime:  utils.TimeToTimestamptz(trip.DepartureTime),
		ArrivalTime:    utils.TimeToTimestamptz(trip.ArrivalTime),
		BasePrice:      utils.Float64ToNumeric(trip.BasePrice),
		PriceModifier:  utils.Float64ToNumeric(trip.PriceModifier),
		IsHotDeal:      utils.BoolToPtr(trip.IsHotDeal),
		PickupPoints:   pointsToJSON(trip.PickupPoints),
		DropoffPoints:  pointsToJSON(trip.DropoffPoints),
		AvailableSeats: trip.AvailableSeats,
	})
	if err != nil {
		return nil, domain.ErrTripNotFound
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
		return nil, domain.ErrTripNotFound
	}
	return sqlcToEntity(result), nil
}

func (r *tripRepository) Delete(ctx context.Context, id int64) error {
	err := r.queries.DeleteTrip(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to delete trip: %w", err)
	}
	return nil
}

func (r *tripRepository) List(ctx context.Context, filter *domain.TripFilter) ([]*domain.Trip, int64, error) {
	// Convert domain TripStatus pointer to *string for sqlc
	var status *string
	if filter.Status != nil {
		s := string(*filter.Status)
		status = &s
	}

	rows, err := r.queries.ListTripsAdmin(ctx, models.ListTripsAdminParams{
		Limit:      filter.Limit,
		Offset:     filter.Offset,
		ProviderID: filter.ProviderID,
		Status:     status,
	})
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list trips: %w", err)
	}

	count, err := r.queries.CountTripsAdmin(ctx, models.CountTripsAdminParams{
		ProviderID: filter.ProviderID,
		Status:     status,
	})
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count trips: %w", err)
	}

	result := make([]*domain.Trip, len(rows))
	for i, row := range rows {
		result[i] = listAdminRowToEntity(row)
	}

	return result, count, nil
}

func (r *tripRepository) Search(ctx context.Context, filter *domain.TripFilter) ([]*domain.Trip, int64, error) {
	if filter.OriginID == nil || filter.DestinationID == nil || filter.DepartureDate == nil {
		return nil, 0, domain.ErrInvalidInput
	}

	rows, err := r.queries.SearchTrips(ctx, models.SearchTripsParams{
		OriginID:       *filter.OriginID,
		DestinationID:  *filter.DestinationID,
		Column3:        utils.TimeToDate(*filter.DepartureDate),
		AvailableSeats: filter.MinSeats,
		Limit:          filter.Limit,
		Offset:         filter.Offset,
	})
	if err != nil {
		return nil, 0, fmt.Errorf("failed to search trips: %w", err)
	}

	count, err := r.queries.CountSearchTrips(ctx, models.CountSearchTripsParams{
		OriginID:       *filter.OriginID,
		DestinationID:  *filter.DestinationID,
		Column3:        utils.TimeToDate(*filter.DepartureDate),
		AvailableSeats: filter.MinSeats,
	})
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count search trips: %w", err)
	}

	result := make([]*domain.Trip, len(rows))
	for i, row := range rows {
		result[i] = searchRowToEntity(row)
	}

	return result, count, nil
}

func (r *tripRepository) CountActiveBookings(ctx context.Context, tripID int64) (int64, error) {
	return r.queries.CountActiveBookingsByTripID(ctx, tripID)
}
