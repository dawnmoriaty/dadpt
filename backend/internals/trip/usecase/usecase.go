package usecase

import (
	"context"
	"fmt"
	"time"

	"backend/internals/trip/domain"
	"backend/pkgs/paging"
)

// ITripUseCase defines the interface for trip use case
type ITripUseCase interface {
	Create(ctx context.Context, input *domain.CreateTripInput) (*domain.Trip, error)
	GetByID(ctx context.Context, id int64) (*domain.Trip, error)
	Update(ctx context.Context, id int64, input *domain.UpdateTripInput) (*domain.Trip, error)
	UpdateStatus(ctx context.Context, id int64, newStatus string) (*domain.Trip, error)
	Delete(ctx context.Context, id int64) error
	List(ctx context.Context, pg *paging.Paging, input *domain.AdminListInput) ([]*domain.Trip, int64, error)
	Search(ctx context.Context, input *domain.SearchTripsInput) ([]*domain.Trip, int64, error)
	Browse(ctx context.Context, input *domain.BrowseTripsInput) ([]*domain.Trip, int64, error)
}

type tripUseCase struct {
	repo domain.Repository
}

func NewTripUseCase(repo domain.Repository) ITripUseCase {
	return &tripUseCase{repo: repo}
}

func (uc *tripUseCase) Create(ctx context.Context, input *domain.CreateTripInput) (*domain.Trip, error) {
	trip := &domain.Trip{
		ProviderID:     input.ProviderID,
		BusID:          input.BusID,
		OriginID:       input.OriginID,
		DestinationID:  input.DestinationID,
		DepartureTime:  input.DepartureTime,
		ArrivalTime:    input.ArrivalTime,
		BasePrice:      input.BasePrice,
		PriceModifier:  1.0,
		IsHotDeal:      false,
		PickupPoints:   input.PickupPoints,
		DropoffPoints:  input.DropoffPoints,
		AvailableSeats: input.AvailableSeats,
		Status:         domain.TripStatusScheduled,
	}

	// Domain validation
	if err := trip.Validate(); err != nil {
		return nil, err
	}

	created, err := uc.repo.Create(ctx, trip)
	if err != nil {
		return nil, fmt.Errorf("creating trip: %w", err)
	}

	return created, nil
}

func (uc *tripUseCase) GetByID(ctx context.Context, id int64) (*domain.Trip, error) {
	return uc.repo.GetByID(ctx, id)
}

func (uc *tripUseCase) Update(ctx context.Context, id int64, input *domain.UpdateTripInput) (*domain.Trip, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Domain validation
	if err := existing.CanBeModified(); err != nil {
		return nil, err
	}

	// Apply partial updates
	if input.DepartureTime != nil {
		existing.DepartureTime = *input.DepartureTime
	}
	if input.ArrivalTime != nil {
		existing.ArrivalTime = *input.ArrivalTime
	}
	if input.BasePrice != nil {
		existing.BasePrice = *input.BasePrice
	}
	if input.IsHotDeal != nil {
		existing.IsHotDeal = *input.IsHotDeal
	}
	if input.PickupPoints != nil {
		existing.PickupPoints = input.PickupPoints
	}
	if input.DropoffPoints != nil {
		existing.DropoffPoints = input.DropoffPoints
	}

	updated, err := uc.repo.Update(ctx, existing)
	if err != nil {
		return nil, fmt.Errorf("updating trip: %w", err)
	}

	return updated, nil
}

func (uc *tripUseCase) UpdateStatus(ctx context.Context, id int64, newStatus string) (*domain.Trip, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	status := domain.TripStatus(newStatus)
	if !status.IsValid() {
		return nil, domain.ErrTripStatusInvalid
	}

	if err := existing.CanTransitionTo(status); err != nil {
		return nil, err
	}

	updated, err := uc.repo.UpdateStatus(ctx, id, status)
	if err != nil {
		return nil, fmt.Errorf("updating trip status: %w", err)
	}

	return updated, nil
}

func (uc *tripUseCase) Delete(ctx context.Context, id int64) error {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	if err := existing.CanBeDeleted(); err != nil {
		return err
	}

	// Safety check: refuse if trip has pending/paid bookings
	activeCount, err := uc.repo.CountActiveBookings(ctx, id)
	if err != nil {
		return fmt.Errorf("checking active bookings: %w", err)
	}
	if activeCount > 0 {
		return domain.ErrTripHasActiveBookings
	}

	return uc.repo.Delete(ctx, id)
}

func (uc *tripUseCase) List(ctx context.Context, pg *paging.Paging, input *domain.AdminListInput) ([]*domain.Trip, int64, error) {
	filter := &domain.TripFilter{
		Limit:  int32(pg.PageSize),
		Offset: int32(pg.Offset()),
	}

	if input.ProviderID != nil {
		pid := int32(*input.ProviderID)
		filter.ProviderID = &pid
	}
	if input.Status != nil {
		s := domain.TripStatus(*input.Status)
		filter.Status = &s
	}

	return uc.repo.List(ctx, filter)
}

func (uc *tripUseCase) Search(ctx context.Context, input *domain.SearchTripsInput) ([]*domain.Trip, int64, error) {
	date, err := time.Parse("2006-01-02", input.DepartureDate)
	if err != nil {
		return nil, 0, domain.ErrTripDepartureInPast // reuse sentinel for bad date
	}

	pg := &paging.Paging{Page: input.Page, PageSize: input.Limit}
	pg.Process()

	originID := input.OriginID
	destID := input.DestinationID
	filter := &domain.TripFilter{
		OriginID:      &originID,
		DestinationID: &destID,
		DepartureDate: &date,
		MinSeats:      int32(input.MinSeats),
		Limit:         int32(pg.PageSize),
		Offset:        int32(pg.Offset()),
	}

	return uc.repo.Search(ctx, filter)
}

func (uc *tripUseCase) Browse(ctx context.Context, input *domain.BrowseTripsInput) ([]*domain.Trip, int64, error) {
	pg := &paging.Paging{Page: input.Page, PageSize: input.Limit}
	pg.Process()

	filter := &domain.TripFilter{
		Limit:  int32(pg.PageSize),
		Offset: int32(pg.Offset()),
	}

	if input.ProviderID != nil {
		pid := int32(*input.ProviderID)
		filter.ProviderID = &pid
	}
	if input.BusTypeID != nil {
		btid := int32(*input.BusTypeID)
		filter.BusTypeID = &btid
	}

	return uc.repo.Browse(ctx, filter)
}
