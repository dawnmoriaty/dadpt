package usecase

import "backend/internals/bus/domain"

type BusUsecase interface {
	CreateBus(bus *domain.Bus) error
	GetBusById(id int) (*domain.Bus, error)
	GetAllBuses() ([]domain.Bus, error)
	UpdateBus(bus *domain.Bus) error
	DeleteBus(id int) error
}

type busUsecase struct {
	repo domain.Repository
}

// CreateBus implements [BusUsecase].
func (b *busUsecase) CreateBus(bus *domain.Bus) error {
	panic("unimplemented")
}

// DeleteBus implements [BusUsecase].
func (b *busUsecase) DeleteBus(id int) error {
	panic("unimplemented")
}

// GetAllBuses implements [BusUsecase].
func (b *busUsecase) GetAllBuses() ([]domain.Bus, error) {
	panic("unimplemented")
}

// GetBusById implements [BusUsecase].
func (b *busUsecase) GetBusById(id int) (*domain.Bus, error) {
	panic("unimplemented")
}

// UpdateBus implements [BusUsecase].
func (b *busUsecase) UpdateBus(bus *domain.Bus) error {
	panic("unimplemented")
}

func NewBusUsecase(repo domain.Repository) BusUsecase {
	return &busUsecase{repo: repo}
}
