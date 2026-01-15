package usecase

import (
	"context"

	"backend/internals/trip/controller/dto"
	"backend/internals/trip/repository"
	"backend/pkgs/redis"
)

type ITripUseCase interface {
	SearchTrips(ctx context.Context, req *dto.SearchTripsRequest) (*dto.TripListResponse, error)
	GetTripByID(ctx context.Context, id string) (*dto.TripResponse, error)
	CreateTrip(ctx context.Context, req *dto.CreateTripRequest) (*dto.TripResponse, error)
}

type tripUseCase struct {
	repo  repository.ITripRepository
	cache redis.IRedis
}

func NewTripUseCase(repo repository.ITripRepository, cache redis.IRedis) ITripUseCase {
	return &tripUseCase{
		repo:  repo,
		cache: cache,
	}
}

func (u *tripUseCase) SearchTrips(ctx context.Context, req *dto.SearchTripsRequest) (*dto.TripListResponse, error) {
	// TODO: Implement with sqlc generated queries
	return &dto.TripListResponse{
		Trips:  []dto.TripResponse{},
		Paging: req.Paging,
	}, nil
}

func (u *tripUseCase) GetTripByID(ctx context.Context, id string) (*dto.TripResponse, error) {
	// TODO: Implement with sqlc generated queries
	return &dto.TripResponse{}, nil
}

func (u *tripUseCase) CreateTrip(ctx context.Context, req *dto.CreateTripRequest) (*dto.TripResponse, error) {
	// TODO: Implement with sqlc generated queries
	return &dto.TripResponse{}, nil
}
