package dto

import "backend/internals/bus/domain"

type CreateBusRequest struct {
	ProviderID   int32  `json:"providerId" binding:"required"`
	BusTypeID    int32  `json:"busTypeId" binding:"required"`
	LicensePlate string `json:"licensePlate" binding:"required"`
	ImageURL     string `json:"imageUrl"`
}

type UpdateBusRequest struct {
	BusTypeID    *int32  `json:"busTypeId"`
	LicensePlate *string `json:"licensePlate"`
	Status       *string `json:"status"`
	ImageURL     *string `json:"imageUrl"`
}

type UpdateBusStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=active maintenance retired"`
}

type BusResponse struct {
	ID           int32  `json:"id"`
	ProviderID   int32  `json:"providerId"`
	BusTypeID    int32  `json:"busTypeId"`
	LicensePlate string `json:"licensePlate"`
	Status       string `json:"status"`
	ImageURL     string `json:"imageUrl,omitempty"`
	BusTypeName  string `json:"busTypeName,omitempty"`
	TotalSeats   int32  `json:"totalSeats,omitempty"`
	ProviderName string `json:"providerName,omitempty"`
}

func ToBusResponse(b *domain.Bus) *BusResponse {
	return &BusResponse{
		ID:           b.ID,
		ProviderID:   b.ProviderID,
		BusTypeID:    b.BusTypeID,
		LicensePlate: b.LicensePlate,
		Status:       b.Status,
		ImageURL:     b.ImageURL,
		BusTypeName:  b.BusTypeName,
		TotalSeats:   b.TotalSeats,
		ProviderName: b.ProviderName,
	}
}
