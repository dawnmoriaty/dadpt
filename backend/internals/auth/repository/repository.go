package repository

import (
	"context"
	"fmt"

	"backend/db"
	"backend/sql/models"
)

// IAuthRepository interface now uses generated models directly
type IAuthRepository interface {
	GetUserByPhone(ctx context.Context, phone string) (*models.User, error)
	GetUserByIdentifier(ctx context.Context, identifier string) (*models.User, error)
	GetUserByID(ctx context.Context, id int64) (*models.User, error)
	CreateUser(ctx context.Context, params models.CreateUserParams) (*models.User, error)
	PhoneExists(ctx context.Context, phone string) (bool, error)
}

type authRepository struct {
	db      *db.Database
	queries *models.Queries
}

func NewAuthRepository(database *db.Database) IAuthRepository {
	return &authRepository{
		db:      database,
		queries: models.New(database.GetPool()),
	}
}

func (r *authRepository) GetUserByPhone(ctx context.Context, phone string) (*models.User, error) {
	user, err := r.queries.GetUserByPhone(ctx, phone)
	if err != nil {
		return nil, err
	}
	// Return pointer to generated struct
	return &user, nil
}

func (r *authRepository) GetUserByIdentifier(ctx context.Context, identifier string) (*models.User, error) {
	user, err := r.queries.GetUserByIdentifier(ctx, identifier)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *authRepository) GetUserByID(ctx context.Context, id int64) (*models.User, error) {
	user, err := r.queries.GetUserByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *authRepository) CreateUser(ctx context.Context, params models.CreateUserParams) (*models.User, error) {
	// Logic default value for Role if needed
	if params.Role == nil {
		role := "customer"
		params.Role = &role
	}

	user, err := r.queries.CreateUser(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return &user, nil
}

func (r *authRepository) PhoneExists(ctx context.Context, phone string) (bool, error) {
	_, err := r.queries.GetUserByPhone(ctx, phone)
	if err != nil {
		if err.Error() == "no rows in result set" {
			return false, nil
		}
		return false, err
	}
	return true, nil
}
