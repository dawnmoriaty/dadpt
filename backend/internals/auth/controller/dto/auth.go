package dto

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

type RefreshTokenRequest struct {
	RefreshToken string `json:"refreshToken" binding:"required"`
}
