package validator

import (
	"fmt"

	"github.com/go-playground/validator/v10"
)

var validate = validator.New()

type ValidationError struct {
	Field   string `json:"field"`
	Tag     string `json:"tag"`
	Value   string `json:"value"`
	Message string `json:"message"`
}

func Validate(s interface{}) []ValidationError {
	err := validate.Struct(s)
	if err == nil {
		return nil
	}

	var errors []ValidationError
	for _, err := range err.(validator.ValidationErrors) {
		errors = append(errors, ValidationError{
			Field:   err.Field(),
			Tag:     err.Tag(),
			Value:   fmt.Sprintf("%v", err.Value()),
			Message: formatMessage(err),
		})
	}

	return errors
}

func formatMessage(err validator.FieldError) string {
	switch err.Tag() {
	case "required":
		return fmt.Sprintf("Field '%s' is required", err.Field())
	case "email":
		return fmt.Sprintf("Field '%s' must be a valid email", err.Field())
	case "min":
		return fmt.Sprintf("Field '%s' must be at least %s characters", err.Field(), err.Param())
	case "max":
		return fmt.Sprintf("Field '%s' must be at most %s characters", err.Field(), err.Param())
	default:
		return fmt.Sprintf("Field '%s' failed on the '%s' tag", err.Field(), err.Tag())
	}
}
