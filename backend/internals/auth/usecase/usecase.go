package usecase

import (
	"context"
	"errors"
	"fmt"
	"time"

	"backend/configs"
	"backend/internals/auth/controller/dto"
	"backend/internals/auth/repository"
	"backend/pkgs/jwt"
	"backend/pkgs/redis"
	"backend/sql/models"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrPhoneExists        = errors.New("phone number already registered")
	ErrInvalidToken       = errors.New("invalid token")
)

type IAuthUseCase interface {
	Register(ctx context.Context, req *dto.RegisterRequest) (*dto.AuthResponse, error)
	Login(ctx context.Context, req *dto.LoginRequest) (*dto.AuthResponse, error)
	Logout(ctx context.Context, token string) error
	RefreshToken(ctx context.Context, req *dto.RefreshTokenRequest) (*dto.AuthResponse, error)
}

type authUseCase struct {
	repo    repository.IAuthRepository
	jwtProv jwt.JWTProvider
	cache   redis.IRedis
	cfg     *configs.Config
}

func NewAuthUseCase(
	repo repository.IAuthRepository,
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
	exists, err := u.repo.PhoneExists(ctx, req.Phone)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrPhoneExists
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Helper to handle optional fields for generated models
	username := &req.Username
	if req.Username == "" {
		username = nil
	}
	email := &req.Email
	if req.Email == "" {
		email = nil
	}
	role := "customer"

	user, err := u.repo.CreateUser(ctx, models.CreateUserParams{
		Phone:        req.Phone,
		Username:     username,
		PasswordHash: string(hashedPassword),
		FullName:     req.FullName,
		Email:        email,
		Role:         &role,
	})
	if err != nil {
		return nil, err
	}

	return u.generateAuthResponse(ctx, user)
}

func (u *authUseCase) Login(ctx context.Context, req *dto.LoginRequest) (*dto.AuthResponse, error) {
	// 1. Find user by Identifier (Phone OR Email OR Username)
	user, err := u.repo.GetUserByIdentifier(ctx, req.Identifier)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	// 2. Check Password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	return u.generateAuthResponse(ctx, user)
}

func (u *authUseCase) RefreshToken(ctx context.Context, req *dto.RefreshTokenRequest) (*dto.AuthResponse, error) {
	// 1. Verify Refresh Token in Redis?
	// Simplified: We assume refresh token is opaque string.
	// But robust way: Check if it exists in Redis.

	key := fmt.Sprintf("refresh_token:%s", req.RefreshToken)
	var userID int64
	err := u.cache.Get(key, &userID)
	if err != nil {
		return nil, ErrInvalidToken // Not found or expired
	}

	// 2. Get User
	user, err := u.repo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// 3. Rotate Token: Delete old, create new
	u.cache.Remove(key)

	return u.generateAuthResponse(ctx, user)
}

func (u *authUseCase) Logout(ctx context.Context, tokenString string) error {
	// 1. Validate Token format & signature first
	claims, err := u.jwtProv.ValidateToken(tokenString)
	if err != nil {
		return err
	}

	// 2. Calculate remaining time for expiration to set key TTL
	// We only need to blacklist it until it expires naturally.
	expFloat, ok := (*claims)["exp"].(float64)
	if !ok {
		return ErrInvalidToken
	}
	expTime := time.Unix(int64(expFloat), 0)
	remainingTime := time.Until(expTime)

	if remainingTime <= 0 {
		return nil // Already expired, no need to blacklist
	}

	// 3. Add to Redis Blacklist
	// Key: blacklist:{token} -> Val: "revoked"
	if u.cache != nil && u.cache.IsConnected() {
		blacklistKey := fmt.Sprintf("blacklist:%s", tokenString)
		err := u.cache.SetWithExpiration(blacklistKey, "revoked", remainingTime)
		if err != nil {
			return fmt.Errorf("failed to blacklist token: %w", err)
		}
	}

	return nil
}

func (u *authUseCase) generateAuthResponse(ctx context.Context, user *models.User) (*dto.AuthResponse, error) {
	// Handle nil pointer dereference for optional fields
	username := ""
	if user.Username != nil {
		username = *user.Username
	}
	email := ""
	if user.Email != nil {
		email = *user.Email
	}
	role := "customer"
	if user.Role != nil {
		role = *user.Role
	}

	// 1. Access Token (HS512)
	td, err := u.jwtProv.GenerateToken(user.ID, role, u.cfg.AccessTokenDuration)
	if err != nil {
		return nil, err
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
			Username: username,
			FullName: user.FullName,
			Email:    email,
			Role:     role,
		},
	}, nil
}
