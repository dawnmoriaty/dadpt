package repository

import (
	"context"
	"errors"

	"backend/db"
	"backend/internals/auth/domain"
	"backend/sql/models"

	"github.com/jackc/pgx/v5"
)

// DI
type authRepository struct {
	db      *db.Database
	queries *models.Queries
}

// Implementation of domain.Repository
func NewAuthRepository(database *db.Database) domain.Repository {
	return &authRepository{
		db:      database,
		queries: models.New(database.GetPool()),
	}
}

func sqlcToEntity(m *models.User) *domain.User {
	return &domain.User{
		ID:           m.ID,
		Phone:        domain.Phone(m.Phone),
		Username:     domain.Username(ptrToString(m.Username)),
		PasswordHash: m.PasswordHash,
		FullName:     m.FullName,
		Email:        domain.Email(ptrToString(m.Email)),
		Role:         domain.Role(ptrToString(m.Role)),
		IsActive:     true, // Default active
	}
}

func ptrToString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func stringToPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func (r *authRepository) Create(ctx context.Context, user *domain.User) (*domain.User, error) {
	// Default role if not set
	role := string(user.Role)
	if role == "" {
		role = string(domain.RoleCustomer)
	}

	result, err := r.queries.CreateUser(ctx, models.CreateUserParams{
		Phone:        user.Phone.String(),
		Username:     stringToPtr(user.Username.String()),
		PasswordHash: user.PasswordHash,
		FullName:     user.FullName,
		Email:        stringToPtr(user.Email.String()),
		Role:         &role,
	})
	if err != nil {
		return nil, err
	}

	return sqlcToEntity(&result), nil
}

func (r *authRepository) GetByID(ctx context.Context, id int64) (*domain.User, error) {
	result, err := r.queries.GetUserByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}
	return sqlcToEntity(&result), nil
}

func (r *authRepository) GetByPhone(ctx context.Context, phone domain.Phone) (*domain.User, error) {
	result, err := r.queries.GetUserByPhone(ctx, phone.String())
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}
	return sqlcToEntity(&result), nil
}

func (r *authRepository) GetByIdentifier(ctx context.Context, identifier string) (*domain.User, error) {
	result, err := r.queries.GetUserByIdentifier(ctx, identifier)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}
	return sqlcToEntity(&result), nil
}

func (r *authRepository) PhoneExists(ctx context.Context, phone domain.Phone) (bool, error) {
	_, err := r.queries.GetUserByPhone(ctx, phone.String())
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

// TODO: Implement Update and UpdatePassword methods - before using them

func (r *authRepository) Update(ctx context.Context, user *domain.User) (*domain.User, error) {
	// TODO: Implement UpdateUser query in SQL
	return nil, errors.New("not implemented")
}

func (r *authRepository) UpdatePassword(ctx context.Context, userID int64, passwordHash string) error {
	// TODO: Implement UpdateUserPassword query in SQL
	return errors.New("not implemented")
}
