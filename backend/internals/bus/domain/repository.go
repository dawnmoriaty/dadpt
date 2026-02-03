package domain

type Repository interface {
	CreateBus(bus *Bus) error
	GetBusById(id int) (*Bus, error)
	GetAllBuses() ([]Bus, error)
	UpdateBus(bus *Bus) error
	DeleteBus(id int) error
}
