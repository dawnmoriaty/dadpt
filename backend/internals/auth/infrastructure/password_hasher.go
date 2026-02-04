package infrastructure

import (
	"backend/internals/auth/domain"

	"golang.org/x/crypto/bcrypt"
)

// BcryptHasher implements domain.PasswordHasher using bcrypt
type BcryptHasher struct {
	cost int
}

// NewBcryptHasher creates a new bcrypt password hasher
func NewBcryptHasher() domain.PasswordHasher {
	return &BcryptHasher{
		cost: bcrypt.DefaultCost,
	}
}

// NewBcryptHasherWithCost creates a bcrypt hasher with custom cost
func NewBcryptHasherWithCost(cost int) domain.PasswordHasher {
	return &BcryptHasher{
		cost: cost,
	}
}

// Hash hashes a plain text password
func (h *BcryptHasher) Hash(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), h.cost)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// Compare compares a hashed password with plain text
func (h *BcryptHasher) Compare(hashedPassword, password string) error {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
}
