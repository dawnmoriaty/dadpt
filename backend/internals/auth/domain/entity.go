package domain

import (
	"errors"
	"regexp"
	"strings"
)

// =============================================================================
// SENTINEL ERRORS - Định nghĩa tại domain, cho phép errors.Is() hoạt động
// =============================================================================

var (
	ErrInvalidPhone       = errors.New("invalid phone format: must be Vietnamese phone number")
	ErrInvalidEmail       = errors.New("invalid email format")
	ErrInvalidFullName    = errors.New("full name must be at least 2 characters")
	ErrInvalidUsername    = errors.New("username must be 3-30 alphanumeric characters or underscore")
	ErrInvalidPassword    = errors.New("password must be at least 6 characters")
	ErrInvalidRole        = errors.New("invalid role")
	ErrPhoneAlreadyExists = errors.New("phone number already registered")
	ErrEmailAlreadyExists = errors.New("email already registered")
	ErrUserNotFound       = errors.New("user not found")
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrTokenExpired       = errors.New("token has expired")
	ErrTokenInvalid       = errors.New("invalid token")
	ErrUserInactive       = errors.New("user account is inactive")
)

// =============================================================================
// VALUE OBJECTS - Immutable, self-validating types
// =============================================================================

// Phone represents a validated Vietnamese phone number
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

// Email represents a validated email address
type Email string

func NewEmail(value string) (Email, error) {
	if value == "" {
		return "", nil // Email is optional
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

// Username represents a validated username
type Username string

func NewUsername(value string) (Username, error) {
	if value == "" {
		return "", nil // Username is optional
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

// =============================================================================
// ROLE - Domain enum with behavior
// =============================================================================

// Role defines user roles in the system
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

// CanAccessAdmin checks if role can access admin panel
func (r Role) CanAccessAdmin() bool {
	return r == RoleAdmin || r == RoleOperator
}

// =============================================================================
// USER ENTITY - Core aggregate root
// =============================================================================

// User represents the core user entity - pure business logic, no DB dependencies
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

// ValidateFullName checks if full name is valid
func ValidateFullName(name string) error {
	if len(strings.TrimSpace(name)) < 2 {
		return ErrInvalidFullName
	}
	return nil
}

// ValidatePassword checks password strength - call before hashing
func ValidatePassword(password string) error {
	if len(password) < 6 {
		return ErrInvalidPassword
	}
	return nil
}

// Validate runs all validations on the User entity
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

// CanLogin checks if user can perform login
func (u *User) CanLogin() error {
	if !u.IsActive {
		return ErrUserInactive
	}
	return nil
}

// =============================================================================
// ROLE-BASED ACCESS CONTROL - Business logic in domain
// =============================================================================

// IsCustomer checks if user is a customer
func (u *User) IsCustomer() bool {
	return u.Role == RoleCustomer
}

// IsAdmin checks if user is an admin
func (u *User) IsAdmin() bool {
	return u.Role == RoleAdmin
}

// IsOperator checks if user is an operator
func (u *User) IsOperator() bool {
	return u.Role == RoleOperator
}

// HasAdminAccess checks if user can access admin panel
func (u *User) HasAdminAccess() bool {
	return u.Role.CanAccessAdmin()
}

// =============================================================================
// FACTORY FUNCTIONS - Ensure valid entity creation
// =============================================================================

// NewUserParams contains parameters for creating a new user
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
