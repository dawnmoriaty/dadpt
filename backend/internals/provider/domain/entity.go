package domain

import (
	"errors"
	"regexp"
)

// Sentinel errors — stable English identifiers for errors.Is() matching.
// User-facing messages are resolved by the i18n translator at the HTTP edge.
var (
	ErrProviderNotFound       = errors.New("provider not found")
	ErrProviderNameRequired   = errors.New("provider name required")
	ErrProviderNameTooShort   = errors.New("provider name too short")
	ErrProviderHotlineInvalid = errors.New("invalid hotline")
	ErrProviderSlugInvalid    = errors.New("invalid slug")
	ErrProviderSlugTooShort   = errors.New("slug too short")
	ErrProviderSlugTooLong    = errors.New("slug too long")
	ErrDuplicateSlug          = errors.New("duplicate slug")
	ErrProviderCannotDelete   = errors.New("provider cannot delete")
)

// Provider is a pure domain entity for bus service providers
type Provider struct {
	ID           int32
	Name         string
	Hotline      string
	Slug         string
	PolicyRefund string
	IsActive     bool
}

// ProviderFilter for listing providers
type ProviderFilter struct {
	Limit  int32
	Offset int32
}

// Validation patterns
var (
	hotlineRegex = regexp.MustCompile(`^[0-9\s\-]+$`)
	slugRegex    = regexp.MustCompile(`^[a-z0-9\-]+$`)
)

// Validate validates the provider entity
func (p *Provider) Validate() error {
	if p.Name == "" {
		return ErrProviderNameRequired
	}
	if len(p.Name) < 2 {
		return ErrProviderNameTooShort
	}
	if p.Hotline != "" && !hotlineRegex.MatchString(p.Hotline) {
		return ErrProviderHotlineInvalid
	}
	if p.Slug != "" {
		if !slugRegex.MatchString(p.Slug) {
			return ErrProviderSlugInvalid
		}
		if len(p.Slug) < 3 {
			return ErrProviderSlugTooShort
		}
		if len(p.Slug) > 50 {
			return ErrProviderSlugTooLong
		}
	}
	return nil
}

// GenerateSlug creates a URL-friendly slug from name
func (p *Provider) GenerateSlug() string {
	slug := regexp.MustCompile(`[^a-z0-9\-]`).ReplaceAllString(p.Name, "")
	return slug
}

// CreateProviderInput is the input for creating a new provider
type CreateProviderInput struct {
	Name         string
	Hotline      string
	Slug         string
	PolicyRefund string
}

// UpdateProviderInput is the input for updating a provider (partial update)
type UpdateProviderInput struct {
	Name         *string
	Hotline      *string
	Slug         *string
	PolicyRefund *string
}

// CanBeDeleted checks if provider can be deleted
func (p *Provider) CanBeDeleted() error {
	if p.IsActive {
		return ErrProviderCannotDelete
	}
	return nil
}
