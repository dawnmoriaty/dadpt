package domain

import (
	"errors"
	"regexp"
	"strings"
)

// =============================================================================
// SENTINEL ERRORS — stable English identifiers for errors.Is() matching.
// User-facing messages are resolved by the i18n translator at the HTTP edge.
// =============================================================================

var (
	ErrInvalidPhone       = errors.New("invalid phone format")
	ErrInvalidEmail       = errors.New("invalid email format")
	ErrInvalidFullName    = errors.New("invalid full name")
	ErrInvalidUsername    = errors.New("invalid username")
	ErrInvalidPassword    = errors.New("invalid password")
	ErrInvalidRole        = errors.New("invalid role")
	ErrPhoneAlreadyExists = errors.New("phone already exists")
	ErrEmailAlreadyExists = errors.New("email already exists")
	ErrUserNotFound       = errors.New("user not found")
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrTokenExpired       = errors.New("token expired")
	ErrTokenInvalid       = errors.New("token invalid")
	ErrUserInactive       = errors.New("user inactive")
)

type Phone string

func NewPhone(value string) (Phone, error) {
	p := Phone(value)
	if !p.IsValid() {
		return "", ErrInvalidPhone
	}
	return p, nil
}

func (p Phone) IsValid() bool {
	return phoneRegex.MatchString(string(p))
}

func (p Phone) String() string {
	return string(p)
}

type Email string

func NewEmail(value string) (Email, error) {
	if value == "" {
		return "", nil // Optional
	}
	e := Email(value)
	if !e.IsValid() {
		return "", ErrInvalidEmail
	}
	return e, nil
}

func (e Email) IsValid() bool {
	if e == "" {
		return true // Optional
	}
	return emailRegex.MatchString(string(e))
}

func (e Email) String() string {
	return string(e)
}

type Username string

func NewUsername(value string) (Username, error) {
	if value == "" {
		return "", nil // Optional
	}
	u := Username(value)
	if !u.IsValid() {
		return "", ErrInvalidUsername
	}
	return u, nil
}

func (u Username) IsValid() bool {
	if u == "" {
		return true // Optional
	}
	return usernameRegex.MatchString(string(u))
}

func (u Username) String() string {
	return string(u)
}

// ROLES
type Role string

const (
	RoleCustomer Role = "customer"
	RoleOperator Role = "operator"
	RoleAdmin    Role = "admin"
)

func (r Role) IsValid() bool {
	switch r {
	case RoleCustomer, RoleOperator, RoleAdmin:
		return true
	}
	return false
}

func (r Role) String() string {
	return string(r)
}

// check permission
func (r Role) CanAccessAdmin() bool {
	return r == RoleAdmin || r == RoleOperator
}

// Core Enitty: User
type User struct {
	ID           int64
	Phone        Phone
	Username     Username
	PasswordHash string
	FullName     string
	Email        Email
	Role         Role
	IsActive     bool
}

// Validation regex patterns
var (
	phoneRegex    = regexp.MustCompile(`^(0|\+84)[0-9]{9,10}$`)
	emailRegex    = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_]{3,30}$`)
)

// =============================================================================
// VALIDATION METHODS - All business rules live here
// =============================================================================

func ValidateFullName(name string) error {
	if len(strings.TrimSpace(name)) < 2 {
		return ErrInvalidFullName
	}
	return nil
}

func ValidatePassword(password string) error {
	if len(password) < 6 {
		return ErrInvalidPassword
	}
	return nil
}

func (u *User) Validate() error {
	if !u.Phone.IsValid() {
		return ErrInvalidPhone
	}
	if !u.Email.IsValid() {
		return ErrInvalidEmail
	}
	if err := ValidateFullName(u.FullName); err != nil {
		return err
	}
	if !u.Username.IsValid() {
		return ErrInvalidUsername
	}
	if !u.Role.IsValid() {
		return ErrInvalidRole
	}
	return nil
}

func (u *User) CanLogin() error {
	if !u.IsActive {
		return ErrUserInactive
	}
	return nil
}

// =============================================================================
// ROLE-BASED ACCESS CONTROL - Business logic in domain
// =============================================================================

func (u *User) IsCustomer() bool {
	return u.Role == RoleCustomer
}

func (u *User) IsAdmin() bool {
	return u.Role == RoleAdmin
}

func (u *User) IsOperator() bool {
	return u.Role == RoleOperator
}

func (u *User) HasAdminAccess() bool {
	return u.Role.CanAccessAdmin()
}

// =============================================================================
// FACTORY FUNCTIONS - Ensure valid entity creation
// =============================================================================

type NewUserParams struct {
	Phone    string
	Username string
	FullName string
	Email    string
	Password string // Raw password, will be validated
}

// NewUser creates a new User entity with validation
// Returns the user without password hash - UseCase must handle hashing
func NewUser(params NewUserParams) (*User, error) {
	// Validate and create value objects
	phone, err := NewPhone(params.Phone)
	if err != nil {
		return nil, err
	}

	email, err := NewEmail(params.Email)
	if err != nil {
		return nil, err
	}

	username, err := NewUsername(params.Username)
	if err != nil {
		return nil, err
	}

	if err := ValidateFullName(params.FullName); err != nil {
		return nil, err
	}

	if err := ValidatePassword(params.Password); err != nil {
		return nil, err
	}

	user := &User{
		Phone:    phone,
		Username: username,
		FullName: strings.TrimSpace(params.FullName),
		Email:    email,
		Role:     RoleCustomer, // Default role
		IsActive: true,
	}

	return user, nil
}
