package usecase

import (
	"context"
	"fmt"
	"time"

	"backend/configs"
	"backend/internals/auth/domain"
	"backend/pkgs/jwt"
	"backend/pkgs/redis"

	"github.com/google/uuid"
)

// =============================================================================
// USE CASE INTERFACE - Application service contract
// =============================================================================

// IAuthUseCase defines the authentication use case operations
// Input/Output are domain types, NOT HTTP DTOs
type IAuthUseCase interface {
	Register(ctx context.Context, input *domain.RegisterInput) (*domain.AuthOutput, error)
	Login(ctx context.Context, input *domain.LoginInput) (*domain.AuthOutput, error)
	Logout(ctx context.Context, token string) error
	RefreshToken(ctx context.Context, input *domain.RefreshInput) (*domain.AuthOutput, error)
}

// =============================================================================
// IMPLEMENTATION
// =============================================================================

type authUseCase struct {
	repo    domain.Repository
	hasher  domain.PasswordHasher
	jwtProv jwt.JWTProvider
	cache   redis.IRedis
	cfg     *configs.Config
}

// NewAuthUseCase creates a new auth use case with all dependencies
func NewAuthUseCase(
	repo domain.Repository,
	hasher domain.PasswordHasher,
	jwtProv jwt.JWTProvider,
	cache redis.IRedis,
	cfg *configs.Config,
) IAuthUseCase {
	return &authUseCase{
		repo:    repo,
		hasher:  hasher,
		jwtProv: jwtProv,
		cache:   cache,
		cfg:     cfg,
	}
}

// =============================================================================
// REGISTER - Uses domain factory for validation
// =============================================================================

func (u *authUseCase) Register(ctx context.Context, input *domain.RegisterInput) (*domain.AuthOutput, error) {
	// 1. Create domain entity - validation happens inside factory
	user, err := domain.NewUser(domain.NewUserParams{
		Phone:    input.Phone,
		Username: input.Username,
		FullName: input.FullName,
		Email:    input.Email,
		Password: input.Password,
	})
	if err != nil {
		// Domain validation error - wrap and return
		return nil, err
	}

	// 2. Check phone uniqueness (business rule)
	exists, err := u.repo.PhoneExists(ctx, user.Phone)
	if err != nil {
		return nil, fmt.Errorf("checking phone existence: %w", err)
	}
	if exists {
		return nil, domain.ErrPhoneAlreadyExists
	}

	// 3. Hash password using injected hasher
	hashedPassword, err := u.hasher.Hash(input.Password)
	if err != nil {
		return nil, fmt.Errorf("hashing password: %w", err)
	}
	user.PasswordHash = hashedPassword

	// 4. Persist user
	created, err := u.repo.Create(ctx, user)
	if err != nil {
		return nil, fmt.Errorf("creating user: %w", err)
	}

	// 5. Generate auth tokens
	return u.generateAuthOutput(ctx, created)
}

// =============================================================================
// LOGIN - Domain entity validates login eligibility
// =============================================================================

func (u *authUseCase) Login(ctx context.Context, input *domain.LoginInput) (*domain.AuthOutput, error) {
	// 1. Find user by identifier (phone/email/username)
	user, err := u.repo.GetByIdentifier(ctx, input.Identifier)
	if err != nil {
		// Don't leak whether user exists
		return nil, domain.ErrInvalidCredentials
	}

	// 2. Check if user can login (domain business rule)
	if err := user.CanLogin(); err != nil {
		return nil, err
	}

	// 3. Verify password using hasher
	if err := u.hasher.Compare(user.PasswordHash, input.Password); err != nil {
		return nil, domain.ErrInvalidCredentials
	}

	// 4. Generate auth tokens
	return u.generateAuthOutput(ctx, user)
}

// =============================================================================
// REFRESH TOKEN
// =============================================================================

func (u *authUseCase) RefreshToken(ctx context.Context, input *domain.RefreshInput) (*domain.AuthOutput, error) {
	key := fmt.Sprintf("refresh_token:%s", input.RefreshToken)

	var userID int64
	err := u.cache.Get(key, &userID)
	if err != nil {
		return nil, domain.ErrTokenInvalid
	}

	// Get user from repository
	user, err := u.repo.GetByID(ctx, userID)
	if err != nil {
		return nil, domain.ErrTokenInvalid
	}

	// Check if user can still login
	if err := user.CanLogin(); err != nil {
		return nil, err
	}

	// Rotate token: delete old, create new
	u.cache.Remove(key)

	return u.generateAuthOutput(ctx, user)
}

// =============================================================================
// LOGOUT - Blacklist token
// =============================================================================

func (u *authUseCase) Logout(ctx context.Context, tokenString string) error {
	// 1. Validate token format & signature
	claims, err := u.jwtProv.ValidateToken(tokenString)
	if err != nil {
		return domain.ErrTokenInvalid
	}

	// 2. Calculate remaining TTL for blacklist entry
	expFloat, ok := (*claims)["exp"].(float64)
	if !ok {
		return domain.ErrTokenInvalid
	}
	expTime := time.Unix(int64(expFloat), 0)
	remainingTime := time.Until(expTime)

	if remainingTime <= 0 {
		return nil // Already expired
	}

	// 3. Add to blacklist
	if u.cache != nil && u.cache.IsConnected() {
		blacklistKey := fmt.Sprintf("blacklist:%s", tokenString)
		if err := u.cache.SetWithExpiration(blacklistKey, "revoked", remainingTime); err != nil {
			return fmt.Errorf("blacklisting token: %w", err)
		}
	}

	return nil
}

// =============================================================================
// HELPER - Generate auth response
// =============================================================================

func (u *authUseCase) generateAuthOutput(ctx context.Context, user *domain.User) (*domain.AuthOutput, error) {
	// 1. Generate access token
	td, err := u.jwtProv.GenerateToken(user.ID, user.Role.String(), u.cfg.AccessTokenDuration)
	if err != nil {
		return nil, fmt.Errorf("generating access token: %w", err)
	}

	// 2. Generate refresh token (random UUID)
	refreshToken := uuid.New().String()

	// 3. Store refresh token in Redis
	if u.cache != nil && u.cache.IsConnected() {
		key := fmt.Sprintf("refresh_token:%s", refreshToken)
		_ = u.cache.SetWithExpiration(key, user.ID, u.cfg.RefreshTokenDuration)
	}

	return &domain.AuthOutput{
		AccessToken:  td.AccessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(u.cfg.AccessTokenDuration.Seconds()),
		User:         user,
	}, nil
}
