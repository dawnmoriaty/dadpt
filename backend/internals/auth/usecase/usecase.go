package usecase

import (
	"context"
	"fmt"
	"time"

	"backend/configs"
	"backend/internals/auth/controller/dto"
	"backend/internals/auth/domain"
	"backend/internals/auth/repository"
	"backend/pkgs/errors"
	"backend/pkgs/jwt"
	"backend/pkgs/redis"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type IAuthUseCase interface {
	Register(ctx context.Context, req *dto.RegisterRequest) (*dto.AuthResponse, error)
	Login(ctx context.Context, req *dto.LoginRequest) (*dto.AuthResponse, error)
	Logout(ctx context.Context, token string) error
	RefreshToken(ctx context.Context, req *dto.RefreshTokenRequest) (*dto.AuthResponse, error)
}

type authUseCase struct {
	repo    domain.Repository
	legacy  repository.IAuthRepository // Keep for backward compatibility during transition
	jwtProv jwt.JWTProvider
	cache   redis.IRedis
	cfg     *configs.Config
}

func NewAuthUseCase(
	repo domain.Repository,
	jwtProv jwt.JWTProvider,
	cache redis.IRedis,
	cfg *configs.Config,
) IAuthUseCase {
	return &authUseCase{
		repo:    repo,
		jwtProv: jwtProv,
		cache:   cache,
		cfg:     cfg,
	}
}

func (u *authUseCase) Register(ctx context.Context, req *dto.RegisterRequest) (*dto.AuthResponse, error) {
	// 1. Create domain entity for validation
	user := &domain.User{
		Phone:    req.Phone,
		Username: req.Username,
		FullName: req.FullName,
		Email:    req.Email,
		Role:     domain.RoleCustomer,
	}

	// 2. Run domain validation
	if !user.ValidatePhone() {
		return nil, errors.ValidationError("invalid phone format")
	}
	if !user.ValidateEmail() {
		return nil, errors.ValidationError("invalid email format")
	}
	if !user.ValidateFullName() {
		return nil, errors.ValidationError("full name must be at least 2 characters")
	}
	if !user.ValidateUsername() {
		return nil, errors.ValidationError("username must be 3-30 alphanumeric characters")
	}
	if !user.ValidatePassword(req.Password) {
		return nil, errors.ValidationError("password must be at least 6 characters")
	}

	// 3. Check phone uniqueness
	exists, err := u.repo.PhoneExists(ctx, req.Phone)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.ErrPhoneExists
	}

	// 4. Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to hash password")
	}
	user.PasswordHash = string(hashedPassword)

	// 5. Create user via domain repository
	created, err := u.repo.Create(ctx, user)
	if err != nil {
		return nil, err
	}

	return u.generateAuthResponse(ctx, created)
}

func (u *authUseCase) Login(ctx context.Context, req *dto.LoginRequest) (*dto.AuthResponse, error) {
	// 1. Find user by Identifier (Phone OR Email OR Username)
	user, err := u.repo.GetByIdentifier(ctx, req.Identifier)
	if err != nil {
		return nil, errors.ErrInvalidCredentials
	}

	// 2. Check Password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.ErrInvalidCredentials
	}

	return u.generateAuthResponse(ctx, user)
}

func (u *authUseCase) RefreshToken(ctx context.Context, req *dto.RefreshTokenRequest) (*dto.AuthResponse, error) {
	key := fmt.Sprintf("refresh_token:%s", req.RefreshToken)
	var userID int64
	err := u.cache.Get(key, &userID)
	if err != nil {
		return nil, errors.ErrInvalidToken
	}

	// 2. Get User
	user, err := u.repo.GetByID(ctx, userID)
	if err != nil {
		return nil, errors.ErrInvalidToken
	}

	// 3. Rotate Token: Delete old, create new
	u.cache.Remove(key)

	return u.generateAuthResponse(ctx, user)
}

func (u *authUseCase) Logout(ctx context.Context, tokenString string) error {
	// 1. Validate Token format & signature first
	claims, err := u.jwtProv.ValidateToken(tokenString)
	if err != nil {
		return errors.ErrInvalidToken
	}

	// 2. Calculate remaining time for expiration to set key TTL
	expFloat, ok := (*claims)["exp"].(float64)
	if !ok {
		return errors.ErrInvalidToken
	}
	expTime := time.Unix(int64(expFloat), 0)
	remainingTime := time.Until(expTime)

	if remainingTime <= 0 {
		return nil // Already expired, no need to blacklist
	}

	// 3. Add to Redis Blacklist
	if u.cache != nil && u.cache.IsConnected() {
		blacklistKey := fmt.Sprintf("blacklist:%s", tokenString)
		err := u.cache.SetWithExpiration(blacklistKey, "revoked", remainingTime)
		if err != nil {
			return errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to blacklist token")
		}
	}

	return nil
}

func (u *authUseCase) generateAuthResponse(ctx context.Context, user *domain.User) (*dto.AuthResponse, error) {
	// 1. Access Token (HS512) - use role from domain entity
	td, err := u.jwtProv.GenerateToken(user.ID, user.Role.String(), u.cfg.AccessTokenDuration)
	if err != nil {
		return nil, errors.Wrap(err, 500, errors.ErrCodeInternal, "failed to generate token")
	}

	// 2. Refresh Token (Random UUID)
	refreshToken := uuid.New().String()

	// 3. Store Refresh Token in Redis
	if u.cache != nil && u.cache.IsConnected() {
		key := fmt.Sprintf("refresh_token:%s", refreshToken)
		_ = u.cache.SetWithExpiration(key, user.ID, u.cfg.RefreshTokenDuration)
	}

	return &dto.AuthResponse{
		AccessToken:  td.AccessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(u.cfg.AccessTokenDuration.Seconds()),
		User: dto.UserResponse{
			ID:       user.ID,
			Phone:    user.Phone,
			Username: user.Username,
			FullName: user.FullName,
			Email:    user.Email,
			Role:     user.Role.String(),
		},
	}, nil
}
