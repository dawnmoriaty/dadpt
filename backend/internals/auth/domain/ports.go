package domain

import "context"

type Repository interface {
	Create(ctx context.Context, user *User) (*User, error)
	GetByID(ctx context.Context, id int64) (*User, error)
	GetByPhone(ctx context.Context, phone Phone) (*User, error)
	GetByIdentifier(ctx context.Context, identifier string) (*User, error)
	PhoneExists(ctx context.Context, phone Phone) (bool, error)
	Update(ctx context.Context, user *User) (*User, error)
	UpdatePassword(ctx context.Context, userID int64, passwordHash string) error
}

type PasswordHasher interface {
	Hash(password string) (string, error)
	Compare(hashedPassword, password string) error
}
