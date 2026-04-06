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

type IAuthUseCase interface {
	Register(ctx context.Context, input *domain.RegisterInput) (*domain.AuthOutput, error)
	Login(ctx context.Context, input *domain.LoginInput) (*domain.AuthOutput, error)
	Logout(ctx context.Context, token string) error
	RefreshToken(ctx context.Context, input *domain.RefreshInput) (*domain.AuthOutput, error)
}

type authUseCase struct {
	repo    domain.Repository
	hasher  domain.PasswordHasher
	jwtProv jwt.JWTProvider
	cache   redis.IRedis
	cfg     *configs.Config
}

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

func (u *authUseCase) Register(ctx context.Context, input *domain.RegisterInput) (*domain.AuthOutput, error) {
	user, err := domain.NewUser(domain.NewUserParams{
		Phone:    input.Phone,
		Username: input.Username,
		FullName: input.FullName,
		Email:    input.Email,
		Password: input.Password,
	})
	if err != nil {
		return nil, err
	}

	exists, err := u.repo.PhoneExists(ctx, user.Phone)
	if err != nil {
		return nil, fmt.Errorf("checking phone existence: %w", err)
	}
	if exists {
		return nil, domain.ErrPhoneAlreadyExists
	}

	hashedPassword, err := u.hasher.Hash(input.Password)
	if err != nil {
		return nil, fmt.Errorf("hashing password: %w", err)
	}
	user.PasswordHash = hashedPassword

	created, err := u.repo.Create(ctx, user)
	if err != nil {
		return nil, fmt.Errorf("creating user: %w", err)
	}

	return u.generateAuthOutput(ctx, created)
}

func (u *authUseCase) Login(ctx context.Context, input *domain.LoginInput) (*domain.AuthOutput, error) {
	user, err := u.repo.GetByIdentifier(ctx, input.Identifier)
	if err != nil {
		return nil, domain.ErrInvalidCredentials
	}

	if err := user.CanLogin(); err != nil {
		return nil, err
	}

	if err := u.hasher.Compare(user.PasswordHash, input.Password); err != nil {
		return nil, domain.ErrInvalidCredentials
	}

	return u.generateAuthOutput(ctx, user)
}

func (u *authUseCase) RefreshToken(ctx context.Context, input *domain.RefreshInput) (*domain.AuthOutput, error) {
	key := fmt.Sprintf("refresh_token:%s", input.RefreshToken)

	var userID int64
	err := u.cache.Get(key, &userID)
	if err != nil {
		return nil, domain.ErrTokenInvalid
	}
	user, err := u.repo.GetByID(ctx, userID)
	if err != nil {
		return nil, domain.ErrTokenInvalid
	}

	if err := user.CanLogin(); err != nil {
		return nil, err
	}

	u.cache.Remove(key)

	return u.generateAuthOutput(ctx, user)
}

func (u *authUseCase) Logout(ctx context.Context, tokenString string) error {
	claims, err := u.jwtProv.ValidateToken(tokenString)
	if err != nil {
		return domain.ErrTokenInvalid
	}

	expFloat, ok := (*claims)["exp"].(float64)
	if !ok {
		return domain.ErrTokenInvalid
	}
	expTime := time.Unix(int64(expFloat), 0)
	remainingTime := time.Until(expTime)

	if remainingTime <= 0 {
		return nil
	}

	if u.cache != nil && u.cache.IsConnected() {
		blacklistKey := fmt.Sprintf("blacklist:%s", tokenString)
		if err := u.cache.SetWithExpiration(blacklistKey, "revoked", remainingTime); err != nil {
			return fmt.Errorf("blacklisting token: %w", err)
		}
	}

	return nil
}


func (u *authUseCase) generateAuthOutput(ctx context.Context, user *domain.User) (*domain.AuthOutput, error) {
	td, err := u.jwtProv.GenerateToken(user.ID, user.Role.String(), u.cfg.AccessTokenDuration)
	if err != nil {
		return nil, fmt.Errorf("generating access token: %w", err)
	}

	refreshToken := uuid.New().String()

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
