package dto

import "backend/internals/provider/domain"

type CreateProviderRequest struct {
	Name         string `json:"name" binding:"required"`
	Hotline      string `json:"hotline"`
	Slug         string `json:"slug"`
	PolicyRefund string `json:"policyRefund"`
}

func (r *CreateProviderRequest) ToInput() *domain.CreateProviderInput {
	return &domain.CreateProviderInput{
		Name:         r.Name,
		Hotline:      r.Hotline,
		Slug:         r.Slug,
		PolicyRefund: r.PolicyRefund,
	}
}

type UpdateProviderRequest struct {
	Name         *string `json:"name"`
	Hotline      *string `json:"hotline"`
	Slug         *string `json:"slug"`
	PolicyRefund *string `json:"policyRefund"`
}

func (r *UpdateProviderRequest) ToInput() *domain.UpdateProviderInput {
	return &domain.UpdateProviderInput{
		Name:         r.Name,
		Hotline:      r.Hotline,
		Slug:         r.Slug,
		PolicyRefund: r.PolicyRefund,
	}
}

type ProviderResponse struct {
	ID           int32  `json:"id"`
	Name         string `json:"name"`
	Hotline      string `json:"hotline"`
	Slug         string `json:"slug"`
	PolicyRefund string `json:"policyRefund"`
	IsActive     bool   `json:"isActive"`
}

func ToProviderResponse(p *domain.Provider) *ProviderResponse {
	return &ProviderResponse{
		ID:           p.ID,
		Name:         p.Name,
		Hotline:      p.Hotline,
		Slug:         p.Slug,
		PolicyRefund: p.PolicyRefund,
		IsActive:     p.IsActive,
	}
}
