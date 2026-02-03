package dto

import (
	"encoding/json"

	"backend/internals/bustype/domain"
)

type CreateBusTypeRequest struct {
	Name       string          `json:"name" binding:"required"`
	TotalSeats int32           `json:"totalSeats" binding:"required,min=1"`
	SeatLayout json.RawMessage `json:"seatLayout" binding:"required"`
}

type UpdateBusTypeRequest struct {
	Name       *string         `json:"name"`
	TotalSeats *int32          `json:"totalSeats"`
	SeatLayout json.RawMessage `json:"seatLayout"`
}

type BusTypeResponse struct {
	ID         int32           `json:"id"`
	Name       string          `json:"name"`
	TotalSeats int32           `json:"totalSeats"`
	SeatLayout json.RawMessage `json:"seatLayout"`
}

func ToBusTypeResponse(bt *domain.BusType) *BusTypeResponse {
	return &BusTypeResponse{
		ID:         bt.ID,
		Name:       bt.Name,
		TotalSeats: bt.TotalSeats,
		SeatLayout: bt.SeatLayout,
	}
}
