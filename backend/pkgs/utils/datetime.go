package utils

import (
	"strings"
	"time"
)

// FlexibleTime is a custom JSON time type that parses multiple datetime
// formats (RFC3339, ISO-8601, date-only, etc.).
type FlexibleTime struct {
	time.Time
}

var supportedFormats = []string{
	time.RFC3339,
	"2006-01-02T15:04:05Z07:00",
	"2006-01-02T15:04:05.000Z",
	"2006-01-02T15:04:05",
	"2006-01-02T15:04",
	"2006-01-02 15:04:05",
	"2006-01-02 15:04",
	"2006-01-02",
}

func (ft *FlexibleTime) UnmarshalJSON(data []byte) error {
	s := strings.Trim(string(data), "\"")
	if s == "" || s == "null" {
		return nil
	}

	var lastErr error
	for _, format := range supportedFormats {
		t, err := time.Parse(format, s)
		if err == nil {
			ft.Time = t
			return nil
		}
		lastErr = err
	}
	return lastErr
}

func (ft FlexibleTime) MarshalJSON() ([]byte, error) {
	if ft.Time.IsZero() {
		return []byte("null"), nil
	}
	return []byte(`"` + ft.Time.Format(time.RFC3339) + `"`), nil
}

// ToTime returns the underlying time.Time.
func (ft FlexibleTime) ToTime() time.Time { return ft.Time }

// ToTimePtr returns a *time.Time, or nil when zero.
func (ft *FlexibleTime) ToTimePtr() *time.Time {
	if ft == nil || ft.Time.IsZero() {
		return nil
	}
	t := ft.Time
	return &t
}
