package domain

type CreateBusInput struct {
	ProviderID   int32
	BusTypeID    int32
	LicensePlate string
	ImageURL     string
}

type UpdateBusInput struct {
	BusTypeID    *int32
	LicensePlate *string
	Status       *string
	ImageURL     *string
}

type BusFilter struct {
	Limit      int32
	Offset     int32
	ProviderID int32
	Query      string
	Status     string
}
