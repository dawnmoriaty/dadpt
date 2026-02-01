package domain

import "context"

// Repository là port interface - định nghĩa ở domain, implement ở infrastructure
type Repository interface {
	// User operations
	Create(ctx context.Context, user *User) (*User, error)
	GetByID(ctx context.Context, id int64) (*User, error)
	GetByPhone(ctx context.Context, phone string) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	GetByUsername(ctx context.Context, username string) (*User, error)
	GetByIdentifier(ctx context.Context, identifier string) (*User, error) // Phone OR Email OR Username

	// Check uniqueness
	PhoneExists(ctx context.Context, phone string) (bool, error)
	EmailExists(ctx context.Context, email string) (bool, error)
	UsernameExists(ctx context.Context, username string) (bool, error)

	// Update
	Update(ctx context.Context, user *User) (*User, error)
	UpdatePassword(ctx context.Context, userID int64, passwordHash string) error
}
