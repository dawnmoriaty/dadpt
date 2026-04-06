package domain

import (
	"errors"
	"regexp"
)

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

type Provider struct {
	ID           int32
	Name         string
	Hotline      string
	Slug         string
	PolicyRefund string
	IsActive     bool
}

type ProviderFilter struct {
	Limit    int32
	Offset   int32
	Query    string
	IsActive *bool
}

var (
	hotlineRegex = regexp.MustCompile(`^[0-9\s\-]+$`)
	slugRegex    = regexp.MustCompile(`^[a-z0-9\-]+$`)
)

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

func (p *Provider) GenerateSlug() string {
	slug := regexp.MustCompile(`[^a-z0-9\-]`).ReplaceAllString(p.Name, "")
	return slug
}

type CreateProviderInput struct {
	Name         string
	Hotline      string
	Slug         string
	PolicyRefund string
}

type UpdateProviderInput struct {
	Name         *string
	Hotline      *string
	Slug         *string
	PolicyRefund *string
}

func (p *Provider) CanBeDeleted() error {
	if p.IsActive {
		return ErrProviderCannotDelete
	}
	return nil
}
