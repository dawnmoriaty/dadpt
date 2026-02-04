package domain

// RegisterInput - input cho use case Register
type RegisterInput struct {
	Phone    string
	Username string
	Password string
	FullName string
	Email    string
}

// LoginInput - input cho use case Login
type LoginInput struct {
	Identifier string
	Password   string
}

// RefreshInput - input cho use case RefreshToken
type RefreshInput struct {
	RefreshToken string
}

// AuthOutput - output từ các use case auth
type AuthOutput struct {
	AccessToken  string
	RefreshToken string
	ExpiresIn    int64
	User         *User
}
