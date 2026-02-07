package domain

type CreateBusInput struct {
	ProviderID   int32
	BusTypeID    int32
	LicensePlate string
	ImageURL     string
}
type UpdateBusInput struct {
	ID           int32
	BusTypeID    *int32
	LicensePlate *string
	Status       *string
	ImageURL     *string
}
type UpdateBusStatusInput struct {
	ID     int32
	Status string
}
type BusOutput struct {
	ID           int32
	ProviderID   int32
	BusTypeID    int32
	LicensePlate string
	Status       string
	ImageURL     string
	BusTypeName  string
	TotalSeats   int32
	ProviderName string
}

type ListBusesInput struct {
	Page       int32
	Limit      int32
	ProviderID *int32
	Status     *string
}

type ListBusesOutput struct {
	Buses      []*BusOutput
	Total      int64
	Page       int32
	Limit      int32
	TotalPages int32
}
