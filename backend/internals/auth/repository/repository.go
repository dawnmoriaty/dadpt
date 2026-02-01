package repository

import (
	"context"
	"errors"

	"backend/db"
	"backend/internals/auth/domain"
	apperrors "backend/pkgs/errors"
	"backend/sql/models"

	"github.com/jackc/pgx/v5"
)

// authRepository implements domain.Repository
type authRepository struct {
	db      *db.Database
	queries *models.Queries
}

func NewAuthRepository(database *db.Database) domain.Repository {
	return &authRepository{
		db:      database,
		queries: models.New(database.GetPool()),
	}
}

// Mappers - convert between SQLC models and domain entities

func sqlcToEntity(m *models.User) *domain.User {
	return &domain.User{
		ID:           m.ID,
		Phone:        m.Phone,
		Username:     ptrToString(m.Username),
		PasswordHash: m.PasswordHash,
		FullName:     m.FullName,
		Email:        ptrToString(m.Email),
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

// Repository implementations

func (r *authRepository) Create(ctx context.Context, user *domain.User) (*domain.User, error) {
	// Default role if not set
	role := string(user.Role)
	if role == "" {
		role = string(domain.RoleCustomer)
	}

	result, err := r.queries.CreateUser(ctx, models.CreateUserParams{
		Phone:        user.Phone,
		Username:     stringToPtr(user.Username),
		PasswordHash: user.PasswordHash,
		FullName:     user.FullName,
		Email:        stringToPtr(user.Email),
		Role:         &role,
	})
	if err != nil {
		return nil, apperrors.Wrap(err, 500, apperrors.ErrCodeInternal, "failed to create user")
	}

	return sqlcToEntity(&result), nil
}

func (r *authRepository) GetByID(ctx context.Context, id int64) (*domain.User, error) {
	result, err := r.queries.GetUserByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperrors.ErrNotFound
		}
		return nil, apperrors.Wrap(err, 500, apperrors.ErrCodeInternal, "failed to get user")
	}
	return sqlcToEntity(&result), nil
}

func (r *authRepository) GetByPhone(ctx context.Context, phone string) (*domain.User, error) {
	result, err := r.queries.GetUserByPhone(ctx, phone)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperrors.ErrNotFound
		}
		return nil, apperrors.Wrap(err, 500, apperrors.ErrCodeInternal, "failed to get user")
	}
	return sqlcToEntity(&result), nil
}

func (r *authRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	// Assume we have GetUserByEmail query - if not, use GetByIdentifier
	return r.GetByIdentifier(ctx, email)
}

func (r *authRepository) GetByUsername(ctx context.Context, username string) (*domain.User, error) {
	// Assume we have GetUserByUsername query - if not, use GetByIdentifier
	return r.GetByIdentifier(ctx, username)
}

func (r *authRepository) GetByIdentifier(ctx context.Context, identifier string) (*domain.User, error) {
	result, err := r.queries.GetUserByIdentifier(ctx, identifier)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperrors.ErrNotFound
		}
		return nil, apperrors.Wrap(err, 500, apperrors.ErrCodeInternal, "failed to get user")
	}
	return sqlcToEntity(&result), nil
}

func (r *authRepository) PhoneExists(ctx context.Context, phone string) (bool, error) {
	_, err := r.queries.GetUserByPhone(ctx, phone)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, nil
		}
		return false, apperrors.Wrap(err, 500, apperrors.ErrCodeInternal, "failed to check phone")
	}
	return true, nil
}

func (r *authRepository) EmailExists(ctx context.Context, email string) (bool, error) {
	_, err := r.GetByIdentifier(ctx, email)
	if err != nil {
		if apperrors.ErrNotFound.Error() == err.Error() {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (r *authRepository) UsernameExists(ctx context.Context, username string) (bool, error) {
	_, err := r.GetByIdentifier(ctx, username)
	if err != nil {
		if apperrors.ErrNotFound.Error() == err.Error() {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (r *authRepository) Update(ctx context.Context, user *domain.User) (*domain.User, error) {
	// TODO: Implement UpdateUser query in SQL
	return nil, apperrors.NewAppError(501, apperrors.ErrCodeInternal, "not implemented")
}

func (r *authRepository) UpdatePassword(ctx context.Context, userID int64, passwordHash string) error {
	// TODO: Implement UpdateUserPassword query in SQL
	return apperrors.NewAppError(501, apperrors.ErrCodeInternal, "not implemented")
}

// Legacy interface support for backward compatibility
type IAuthRepository interface {
	GetUserByPhone(ctx context.Context, phone string) (*models.User, error)
	GetUserByIdentifier(ctx context.Context, identifier string) (*models.User, error)
	GetUserByID(ctx context.Context, id int64) (*models.User, error)
	CreateUser(ctx context.Context, params models.CreateUserParams) (*models.User, error)
	PhoneExists(ctx context.Context, phone string) (bool, error)
}

// LegacyAuthRepository wraps domain repository for backward compatibility
type LegacyAuthRepository struct {
	repo domain.Repository
	db   *db.Database
	q    *models.Queries
}

func NewLegacyAuthRepository(database *db.Database) IAuthRepository {
	return &LegacyAuthRepository{
		repo: NewAuthRepository(database),
		db:   database,
		q:    models.New(database.GetPool()),
	}
}

func (r *LegacyAuthRepository) GetUserByPhone(ctx context.Context, phone string) (*models.User, error) {
	result, err := r.q.GetUserByPhone(ctx, phone)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func (r *LegacyAuthRepository) GetUserByIdentifier(ctx context.Context, identifier string) (*models.User, error) {
	result, err := r.q.GetUserByIdentifier(ctx, identifier)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func (r *LegacyAuthRepository) GetUserByID(ctx context.Context, id int64) (*models.User, error) {
	result, err := r.q.GetUserByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func (r *LegacyAuthRepository) CreateUser(ctx context.Context, params models.CreateUserParams) (*models.User, error) {
	if params.Role == nil {
		role := "customer"
		params.Role = &role
	}
	result, err := r.q.CreateUser(ctx, params)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func (r *LegacyAuthRepository) PhoneExists(ctx context.Context, phone string) (bool, error) {
	_, err := r.q.GetUserByPhone(ctx, phone)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}
