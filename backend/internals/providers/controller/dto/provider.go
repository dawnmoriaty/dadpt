package dto

type CreateProviderRequest struct {
	Name         string `json:"name" binding:"required"`
	Hotline      string `json:"hotline"`
	Slug         string `json:"slug"`
	PolicyRefund string `json:"policyRefund"`
}

type UpdateProviderRequest struct {
	Name         *string `json:"name"`
	Hotline      *string `json:"hotline"`
	Slug         *string `json:"slug"`
	PolicyRefund *string `json:"policyRefund"`
}

type ProviderResponse struct {
	ID           int32  `json:"id"`
	Name         string `json:"name"`
	Hotline      string `json:"hotline"`
	Slug         string `json:"slug"`
	PolicyRefund string `json:"policyRefund"`
	IsActive     bool   `json:"isActive"`
}

type ProviderListResponse struct {
	Providers []ProviderResponse `json:"providers"`
	Total     int64              `json:"total"`
}
