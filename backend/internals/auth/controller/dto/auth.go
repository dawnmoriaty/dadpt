package dto

import "backend/internals/auth/domain"

type RegisterRequest struct {
	Phone    string `json:"phone" binding:"required,min=10,max=15"`
	Username string `json:"username" binding:"omitempty,min=3,max=50"`
	Password string `json:"password" binding:"required,min=6"`
	FullName string `json:"fullName" binding:"required,min=2,max=100"`
	Email    string `json:"email" binding:"omitempty,email"`
}

type LoginRequest struct {
	Identifier string `json:"identifier" binding:"required"`
	Password   string `json:"password" binding:"required"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refreshToken" binding:"required"`
}
type AuthResponse struct {
	AccessToken  string       `json:"accessToken"`
	RefreshToken string       `json:"refreshToken,omitempty"`
	ExpiresIn    int64        `json:"expiresIn"`
	User         UserResponse `json:"user"`
}

type UserResponse struct {
	ID       int64  `json:"id"`
	Phone    string `json:"phone"`
	Username string `json:"username,omitempty"`
	FullName string `json:"fullName"`
	Email    string `json:"email,omitempty"`
	Role     string `json:"role"`
}

func ToAuthResponse(out *domain.AuthOutput) *AuthResponse {
	return &AuthResponse{
		AccessToken:  out.AccessToken,
		RefreshToken: out.RefreshToken,
		ExpiresIn:    out.ExpiresIn,
		User: UserResponse{
			ID:       out.User.ID,
			Phone:    out.User.Phone.String(),
			Username: out.User.Username.String(),
			FullName: out.User.FullName,
			Email:    out.User.Email.String(),
			Role:     out.User.Role.String(),
		},
	}
}

func ToUserResponse(user *domain.User) *UserResponse {
	return &UserResponse{
		ID:       user.ID,
		Phone:    user.Phone.String(),
		Username: user.Username.String(),
		FullName: user.FullName,
		Email:    user.Email.String(),
		Role:     user.Role.String(),
	}
}

func (r *RegisterRequest) ToRegisterInput() *domain.RegisterInput {
	return &domain.RegisterInput{
		Phone:    r.Phone,
		Username: r.Username,
		Password: r.Password,
		FullName: r.FullName,
		Email:    r.Email,
	}
}

func (r *LoginRequest) ToLoginInput() *domain.LoginInput {
	return &domain.LoginInput{
		Identifier: r.Identifier,
		Password:   r.Password,
	}
}
func (r *RefreshRequest) ToRefreshInput() *domain.RefreshInput {
	return &domain.RefreshInput{
		RefreshToken: r.RefreshToken,
	}
}
