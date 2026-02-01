package dto

type CreateLocationRequest struct {
	Name     string `json:"name" binding:"required"`
	City     string `json:"city" binding:"required"`
	Address  string `json:"address"`
	Keywords string `json:"keywords"`
}

type UpdateLocationRequest struct {
	Name     *string `json:"name"`
	City     *string `json:"city"`
	Address  *string `json:"address"`
	Keywords *string `json:"keywords"`
}

type LocationResponse struct {
	ID       int32  `json:"id"`
	Name     string `json:"name"`
	City     string `json:"city"`
	Address  string `json:"address"`
	Keywords string `json:"keywords"`
}

type SearchLocationRequest struct {
	Query string `form:"q" binding:"required"`
}
