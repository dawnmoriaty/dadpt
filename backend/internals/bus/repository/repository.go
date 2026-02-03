package repository

import (
	"backend/db"
	"backend/internals/bus/domain"
	"backend/sql/models"
)

type busRepository struct {
	db      *db.Database
	queries *models.Queries
}

// CreateBus implements [domain.Repository].
func (b *busRepository) CreateBus(bus *domain.Bus) error {
	panic("unimplemented")
}

// DeleteBus implements [domain.Repository].
func (b *busRepository) DeleteBus(id int) error {
	panic("unimplemented")
}

// GetAllBuses implements [domain.Repository].
func (b *busRepository) GetAllBuses() ([]domain.Bus, error) {
	panic("unimplemented")
}

// GetBusById implements [domain.Repository].
func (b *busRepository) GetBusById(id int) (*domain.Bus, error) {
	panic("unimplemented")
}

// UpdateBus implements [domain.Repository].
func (b *busRepository) UpdateBus(bus *domain.Bus) error {
	panic("unimplemented")
}

func NewBusRepository(database *db.Database) domain.Repository {
	return &busRepository{
		db:      database,
		queries: models.New(database.GetPool()),
	}
}
