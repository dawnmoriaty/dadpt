package validator

import (
	"backend/pkgs/i18n"
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

// Validate checks the struct with go-playground/validator.
// The returned messages are resolved via i18n using the provided language.
func Validate(s interface{}) []ValidationError {
	return ValidateWithLang(s, "vi")
}

// ValidateWithLang checks the struct and resolves messages for the given language.
func ValidateWithLang(s interface{}, lang string) []ValidationError {
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
			Message: formatMessage(err, lang),
		})
	}

	return errors
}

func formatMessage(err validator.FieldError, lang string) string {
	switch err.Tag() {
	case "required":
		return i18n.T(lang, "VALIDATION_REQUIRED", map[string]string{"field": err.Field()})
	case "email":
		return i18n.T(lang, "VALIDATION_EMAIL", map[string]string{"field": err.Field()})
	case "min":
		return i18n.T(lang, "VALIDATION_MIN", map[string]string{"field": err.Field(), "param": err.Param()})
	case "max":
		return i18n.T(lang, "VALIDATION_MAX", map[string]string{"field": err.Field(), "param": err.Param()})
	default:
		return i18n.T(lang, "VALIDATION_INVALID_TAG", map[string]string{"field": err.Field(), "tag": err.Tag()})
	}
}
