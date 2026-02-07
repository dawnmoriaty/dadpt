package domain

// CreateBusInput is the input for creating a new bus
type CreateBusInput struct {
	ProviderID   int32
	BusTypeID    int32
	LicensePlate string
	ImageURL     string
}

// UpdateBusInput is the input for updating a bus (partial update)
type UpdateBusInput struct {
	BusTypeID    *int32
	LicensePlate *string
	Status       *string
	ImageURL     *string
}
