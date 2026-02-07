package domain

type RegisterInput struct {
	Phone    string
	Username string
	Password string
	FullName string
	Email    string
}

type LoginInput struct {
	Identifier string
	Password   string
}

type RefreshInput struct {
	RefreshToken string
}

type AuthOutput struct {
	AccessToken  string
	RefreshToken string
	ExpiresIn    int64
	User         *User
}
