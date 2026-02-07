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

// IAuthUseCase định nghĩa các phương thức cho use case xác thực
// Input/Output là các DTO định nghĩa trong domain/dto.go
// Các quy tắc nghiệp vụ và xác thực phức tạp được xử lý trong domain/entity.go
// Sử dụng các cổng (ports) định nghĩa trong domain/ports.go để tương tác với hạ tầng
// như kho lưu trữ người dùng, băm mật khẩu, JWT, Redis, v.v.
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
	// 1. Tạo User entity từ input - domain validation
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

	// 2. Kiểm tra nghiệp vụ: số điện thoại đã tồn tại chưa
	exists, err := u.repo.PhoneExists(ctx, user.Phone)
	if err != nil {
		return nil, fmt.Errorf("checking phone existence: %w", err)
	}
	if exists {
		return nil, domain.ErrPhoneAlreadyExists
	}

	// 3. Hash password
	hashedPassword, err := u.hasher.Hash(input.Password)
	if err != nil {
		return nil, fmt.Errorf("hashing password: %w", err)
	}
	user.PasswordHash = hashedPassword

	// 4. Lưu user vào kho lưu trữ
	created, err := u.repo.Create(ctx, user)
	if err != nil {
		return nil, fmt.Errorf("creating user: %w", err)
	}

	// 5. Generate auth tokens
	return u.generateAuthOutput(ctx, created)
}

func (u *authUseCase) Login(ctx context.Context, input *domain.LoginInput) (*domain.AuthOutput, error) {
	// 1. Tìm
	user, err := u.repo.GetByIdentifier(ctx, input.Identifier)
	if err != nil {
		return nil, domain.ErrInvalidCredentials
	}

	// 2. Kiểm tra xem user có thể đăng nhập không (quy tắc nghiệp vụ domain)
	if err := user.CanLogin(); err != nil {
		return nil, err
	}

	// 3. Kiểm tra mk
	if err := u.hasher.Compare(user.PasswordHash, input.Password); err != nil {
		return nil, domain.ErrInvalidCredentials
	}

	// 4. Generate auth tokens
	return u.generateAuthOutput(ctx, user)
}

func (u *authUseCase) RefreshToken(ctx context.Context, input *domain.RefreshInput) (*domain.AuthOutput, error) {
	key := fmt.Sprintf("refresh_token:%s", input.RefreshToken)

	var userID int64
	err := u.cache.Get(key, &userID)
	if err != nil {
		return nil, domain.ErrTokenInvalid
	}
	// Tìm
	user, err := u.repo.GetByID(ctx, userID)
	if err != nil {
		return nil, domain.ErrTokenInvalid
	}

	// Kiểm tra login
	if err := user.CanLogin(); err != nil {
		return nil, err
	}

	// Xoá refresh token cũ
	u.cache.Remove(key)

	return u.generateAuthOutput(ctx, user)
}

func (u *authUseCase) Logout(ctx context.Context, tokenString string) error {
	// 1. ktra định dạng
	claims, err := u.jwtProv.ValidateToken(tokenString)
	if err != nil {
		return domain.ErrTokenInvalid
	}

	// 2. Tính toán thời gian còn lại
	expFloat, ok := (*claims)["exp"].(float64)
	if !ok {
		return domain.ErrTokenInvalid
	}
	expTime := time.Unix(int64(expFloat), 0)
	remainingTime := time.Until(expTime)

	if remainingTime <= 0 {
		return nil
	}

	// 3. Thêm vào blacklist
	if u.cache != nil && u.cache.IsConnected() {
		blacklistKey := fmt.Sprintf("blacklist:%s", tokenString)
		if err := u.cache.SetWithExpiration(blacklistKey, "revoked", remainingTime); err != nil {
			return fmt.Errorf("blacklisting token: %w", err)
		}
	}

	return nil
}

// ============HELPER METHODS =============================

func (u *authUseCase) generateAuthOutput(ctx context.Context, user *domain.User) (*domain.AuthOutput, error) {
	// 1. Tạo access token
	td, err := u.jwtProv.GenerateToken(user.ID, user.Role.String(), u.cfg.AccessTokenDuration)
	if err != nil {
		return nil, fmt.Errorf("generating access token: %w", err)
	}

	// 2. Tạo refresh token (random UUID)
	refreshToken := uuid.New().String()

	// 3. Lưu refresh token vào Redis
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
