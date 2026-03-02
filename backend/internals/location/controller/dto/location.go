package dto

import "backend/internals/location/domain"

type CreateLocationRequest struct {
	Name     string `json:"name" binding:"required"`
	City     string `json:"city" binding:"required"`
	Address  string `json:"address"`
	Keywords string `json:"keywords"`
	ImageURL string `json:"imageUrl"`
}

func (r *CreateLocationRequest) ToInput() *domain.CreateLocationInput {
	return &domain.CreateLocationInput{
		Name:     r.Name,
		City:     r.City,
		Address:  r.Address,
		Keywords: r.Keywords,
		ImageURL: r.ImageURL,
	}
}

type UpdateLocationRequest struct {
	Name     *string `json:"name"`
	City     *string `json:"city"`
	Address  *string `json:"address"`
	Keywords *string `json:"keywords"`
	ImageURL *string `json:"imageUrl"`
}

func (r *UpdateLocationRequest) ToInput() *domain.UpdateLocationInput {
	return &domain.UpdateLocationInput{
		Name:     r.Name,
		City:     r.City,
		Address:  r.Address,
		Keywords: r.Keywords,
		ImageURL: r.ImageURL,
	}
}

type LocationResponse struct {
	ID       int32  `json:"id"`
	Name     string `json:"name"`
	City     string `json:"city"`
	Address  string `json:"address"`
	Keywords string `json:"keywords"`
	ImageURL string `json:"imageUrl,omitempty"`
}

func ToLocationResponse(loc *domain.Location) *LocationResponse {
	return &LocationResponse{
		ID:       loc.ID,
		Name:     loc.Name,
		City:     loc.City,
		Address:  loc.Address,
		Keywords: loc.Keywords,
		ImageURL: loc.ImageURL,
	}
}

type SearchLocationRequest struct {
	Query string `form:"q" binding:"required"`
}
