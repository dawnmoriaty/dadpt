package domain

import (
	"regexp"
	"strings"
)

// User represents the core user entity - pure business logic, no DB dependencies
type User struct {
	ID           int64
	Phone        string
	Username     string
	PasswordHash string
	FullName     string
	Email        string
	Role         Role
	IsActive     bool
}

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

// Validation methods - pure Go, no dependencies

var (
	phoneRegex = regexp.MustCompile(`^(0|\+84)[0-9]{9,10}$`)
	emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
)

func (u *User) ValidatePhone() bool {
	return phoneRegex.MatchString(u.Phone)
}

func (u *User) ValidateEmail() bool {
	if u.Email == "" {
		return true // Email is optional
	}
	return emailRegex.MatchString(u.Email)
}

func (u *User) ValidateFullName() bool {
	return len(strings.TrimSpace(u.FullName)) >= 2
}

func (u *User) ValidatePassword(password string) bool {
	// Minimum 6 characters
	return len(password) >= 6
}

func (u *User) ValidateUsername() bool {
	if u.Username == "" {
		return true // Username is optional
	}
	// 3-30 characters, alphanumeric and underscore only
	usernameRegex := regexp.MustCompile(`^[a-zA-Z0-9_]{3,30}$`)
	return usernameRegex.MatchString(u.Username)
}

// Validate runs all validations and returns error messages
func (u *User) Validate() []string {
	var errs []string

	if !u.ValidatePhone() {
		errs = append(errs, "invalid phone format")
	}
	if !u.ValidateEmail() {
		errs = append(errs, "invalid email format")
	}
	if !u.ValidateFullName() {
		errs = append(errs, "full name must be at least 2 characters")
	}
	if !u.ValidateUsername() {
		errs = append(errs, "username must be 3-30 alphanumeric characters")
	}
	if !u.Role.IsValid() {
		errs = append(errs, "invalid role")
	}

	return errs
}

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
