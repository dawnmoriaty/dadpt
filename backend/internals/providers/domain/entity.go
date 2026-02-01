package domain

import (
	"regexp"
	"strings"
)

// Domain validation errors - defined as constants for consistency
var (
	ErrProviderNameRequired   = "PROVIDER_NAME_REQUIRED"
	ErrProviderNameTooShort   = "PROVIDER_NAME_TOO_SHORT"
	ErrProviderHotlineInvalid = "PROVIDER_HOTLINE_INVALID"
	ErrProviderSlugInvalid    = "PROVIDER_SLUG_INVALID"
	ErrProviderSlugTooShort   = "PROVIDER_SLUG_TOO_SHORT"
	ErrProviderSlugTooLong    = "PROVIDER_SLUG_TOO_LONG"
	ErrProviderCannotDelete   = "PROVIDER_CANNOT_DELETE_ACTIVE"
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

func (p *Provider) ValidateName() (bool, string) {
	name := strings.TrimSpace(p.Name)
	if name == "" {
		return false, ErrProviderNameRequired
	}
	if len(name) < 2 {
		return false, ErrProviderNameTooShort
	}
	return true, ""
}

func (p *Provider) ValidateHotline() (bool, string) {
	if p.Hotline == "" {
		return true, "" // Optional
	}
	if !hotlineRegex.MatchString(p.Hotline) {
		return false, ErrProviderHotlineInvalid
	}
	return true, ""
}

func (p *Provider) ValidateSlug() (bool, string) {
	if p.Slug == "" {
		return true, "" // Optional
	}
	if !slugRegex.MatchString(p.Slug) {
		return false, ErrProviderSlugInvalid
	}
	if len(p.Slug) < 3 {
		return false, ErrProviderSlugTooShort
	}
	if len(p.Slug) > 50 {
		return false, ErrProviderSlugTooLong
	}
	return true, ""
}

// Validate runs all validations and returns error codes
func (p *Provider) Validate() []string {
	var errs []string
	if valid, code := p.ValidateName(); !valid {
		errs = append(errs, code)
	}
	if valid, code := p.ValidateHotline(); !valid {
		errs = append(errs, code)
	}
	if valid, code := p.ValidateSlug(); !valid {
		errs = append(errs, code)
	}
	return errs
}

// GenerateSlug creates a URL-friendly slug from name
func (p *Provider) GenerateSlug() string {
	slug := strings.ToLower(p.Name)
	slug = strings.ReplaceAll(slug, " ", "-")
	slug = regexp.MustCompile(`[^a-z0-9\-]`).ReplaceAllString(slug, "")
	return slug
}

// CanBeDeleted checks if provider can be deleted
func (p *Provider) CanBeDeleted() (bool, string) {
	if p.IsActive {
		return false, ErrProviderCannotDelete
	}
	return true, ""
}
