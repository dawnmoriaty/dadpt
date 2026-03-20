package domain

import "context"

// Repository defines the port for provider persistence
type Repository interface {
	Create(ctx context.Context, provider *Provider) (*Provider, error)
	GetByID(ctx context.Context, id int32) (*Provider, error)
	GetBySlug(ctx context.Context, slug string) (*Provider, error)
	Update(ctx context.Context, provider *Provider) (*Provider, error)
	Delete(ctx context.Context, id int32) error
	List(ctx context.Context, filter *ProviderFilter) ([]*Provider, error)
	Count(ctx context.Context, filter *ProviderFilter) (int64, error)
	ListActive(ctx context.Context) ([]*Provider, error)
	ToggleActive(ctx context.Context, id int32) (*Provider, error)
}
