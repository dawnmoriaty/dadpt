package usecase

import (
	"context"
	"time"

	"backend/internals/trip/controller/dto"
	"backend/internals/trip/domain"
	"backend/pkgs/errors"
	"backend/pkgs/paging"
)

type TripUseCase struct {
	repo domain.Repository
}

func NewTripUseCase(repo domain.Repository) *TripUseCase {
	return &TripUseCase{repo: repo}
}

func (uc *TripUseCase) Create(ctx context.Context, req *dto.CreateTripRequest) (*dto.TripResponse, error) {
	if req.ProviderID <= 0 {
		return nil, errors.RequiredField("provider_id")
	}
	if req.OriginID <= 0 || req.DestinationID <= 0 {
		return nil, errors.RequiredField("origin_id and destination_id")
	}
	if req.DepartureTime.Before(time.Now()) {
		return nil, errors.ValidationError("departure time must be in the future")
	}
	if req.ArrivalTime.Before(req.DepartureTime) {
		return nil, errors.ValidationError("arrival time must be after departure time")
	}

	trip := &domain.Trip{
		ProviderID:     int32(req.ProviderID),
		BusID:          int32(req.BusID),
		OriginID:       int32(req.OriginID),
		DestinationID:  int32(req.DestinationID),
		DepartureTime:  req.DepartureTime,
		ArrivalTime:    req.ArrivalTime,
		BasePrice:      req.BasePrice,
		PriceModifier:  1.0,
		IsHotDeal:      false,
		PickupPoints:   dtoPointsToDomain(req.PickupPoints),
		DropoffPoints:  dtoPointsToDomain(req.DropoffPoints),
		AvailableSeats: int32(req.AvailableSeats),
		Status:         domain.TripStatusScheduled,
	}

	created, err := uc.repo.Create(ctx, trip)
	if err != nil {
		return nil, err
	}

	return entityToResponse(created), nil
}

func (uc *TripUseCase) GetByID(ctx context.Context, id int64) (*dto.TripResponse, error) {
	trip, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return entityToResponse(trip), nil
}

func (uc *TripUseCase) Update(ctx context.Context, id int64, req *dto.UpdateTripRequest) (*dto.TripResponse, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Use domain validation
	if canModify, errCode := existing.CanBeModified(); !canModify {
		return nil, errors.ValidationError(errCode)
	}

	// Apply partial updates
	if req.DepartureTime != nil {
		existing.DepartureTime = *req.DepartureTime
	}
	if req.ArrivalTime != nil {
		existing.ArrivalTime = *req.ArrivalTime
	}
	if req.BasePrice != nil {
		existing.BasePrice = *req.BasePrice
	}
	if req.IsHotDeal != nil {
		existing.IsHotDeal = *req.IsHotDeal
	}
	if req.PickupPoints != nil {
		existing.PickupPoints = dtoPointsToDomain(req.PickupPoints)
	}
	if req.DropoffPoints != nil {
		existing.DropoffPoints = dtoPointsToDomain(req.DropoffPoints)
	}

	updated, err := uc.repo.Update(ctx, existing)
	if err != nil {
		return nil, err
	}

	return entityToResponse(updated), nil
}

func (uc *TripUseCase) UpdateStatus(ctx context.Context, id int64, newStatus string) (*dto.TripResponse, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	status := domain.TripStatus(newStatus)
	if !status.IsValid() {
		return nil, errors.ErrInvalidTripStatus
	}

	if canTransition, errCode := existing.CanTransitionTo(status); !canTransition {
		return nil, errors.ValidationError(errCode)
	}

	updated, err := uc.repo.UpdateStatus(ctx, id, status)
	if err != nil {
		return nil, err
	}

	return entityToResponse(updated), nil
}

func (uc *TripUseCase) Delete(ctx context.Context, id int64) error {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// Use domain validation
	if canDelete, errCode := existing.CanBeDeleted(); !canDelete {
		return errors.ValidationError(errCode)
	}

	return uc.repo.Delete(ctx, id)
}

func (uc *TripUseCase) List(ctx context.Context, pg *paging.Paging, req *dto.AdminTripListRequest) (*paging.Page[dto.TripResponse], error) {
	filter := &domain.TripFilter{
		Limit:  int32(pg.PageSize),
		Offset: int32(pg.Offset()),
	}

	if req.ProviderID != nil {
		pid := int32(*req.ProviderID)
		filter.ProviderID = &pid
	}
	if req.Status != nil {
		s := domain.TripStatus(*req.Status)
		filter.Status = &s
	}

	trips, total, err := uc.repo.List(ctx, filter)
	if err != nil {
		return nil, err
	}

	items := make([]dto.TripResponse, len(trips))
	for i, trip := range trips {
		items[i] = *entityToResponse(trip)
	}

	return paging.Of(items, total, pg.Page), nil
}

func (uc *TripUseCase) Search(ctx context.Context, req *dto.SearchTripsRequest) (*paging.Page[dto.TripResponse], error) {
	if req.OriginID <= 0 || req.DestinationID <= 0 {
		return nil, errors.RequiredField("origin_id and destination_id")
	}
	if req.DepartureDate == "" {
		return nil, errors.RequiredField("departure_date")
	}

	date, err := time.Parse("2006-01-02", req.DepartureDate)
	if err != nil {
		return nil, errors.ValidationError("invalid departure_date format, use YYYY-MM-DD")
	}

	pg := &paging.Paging{Page: req.Page, PageSize: req.Limit}
	pg.Process()

	originID := int32(req.OriginID)
	destID := int32(req.DestinationID)
	filter := &domain.TripFilter{
		OriginID:      &originID,
		DestinationID: &destID,
		DepartureDate: &date,
		MinSeats:      int32(req.MinSeats),
		Limit:         int32(pg.PageSize),
		Offset:        int32(pg.Offset()),
	}

	trips, total, err := uc.repo.Search(ctx, filter)
	if err != nil {
		return nil, err
	}

	items := make([]dto.TripResponse, len(trips))
	for i, trip := range trips {
		items[i] = *entityToResponse(trip)
	}

	return paging.Of(items, total, pg.Page), nil
}

// Helpers

func dtoPointsToDomain(points []dto.Point) []domain.Point {
	if points == nil {
		return nil
	}
	result := make([]domain.Point, len(points))
	for i, p := range points {
		result[i] = domain.Point{
			Name:      p.Name,
			Time:      p.Time,
			Surcharge: p.Surcharge,
		}
	}
	return result
}

func entityToResponse(trip *domain.Trip) *dto.TripResponse {
	finalPrice := trip.BasePrice * trip.PriceModifier
	return &dto.TripResponse{
		ID:              trip.ID,
		ProviderID:      int(trip.ProviderID),
		ProviderName:    trip.ProviderName,
		OriginName:      trip.OriginName,
		OriginCity:      trip.OriginCity,
		DestinationName: trip.DestinationName,
		DestinationCity: trip.DestinationCity,
		DepartureTime:   trip.DepartureTime,
		ArrivalTime:     trip.ArrivalTime,
		BasePrice:       trip.BasePrice,
		FinalPrice:      finalPrice,
		AvailableSeats:  int(trip.AvailableSeats),
		IsHotDeal:       trip.IsHotDeal,
		Status:          string(trip.Status),
	}
}
