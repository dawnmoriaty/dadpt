package domain

import (
	"errors"
	"regexp"
)

// Sentinel errors
var (
	ErrProviderNotFound       = errors.New("Không tìm thấy nhà cung cấp")
	ErrProviderNameRequired   = errors.New("Tên nhà cung cấp là bắt buộc")
	ErrProviderNameTooShort   = errors.New("Tên nhà cung cấp quá ngắn")
	ErrProviderHotlineInvalid = errors.New("Số hotline không hợp lệ")
	ErrProviderSlugInvalid    = errors.New("Slug không hợp lệ")
	ErrProviderSlugTooShort   = errors.New("Slug quá ngắn")
	ErrProviderSlugTooLong    = errors.New("Slug quá dài")
	ErrDuplicateSlug          = errors.New("Slug đã tồn tại")
	ErrProviderCannotDelete   = errors.New("Chỉ có thể xóa nhà cung cấp không hoạt động")
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
