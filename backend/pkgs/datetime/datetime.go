package datetime

import (
	"strings"
	"time"
)

// FlexibleTime is a custom type that can parse multiple datetime formats
// It supports formats like:
// - RFC3339: "2006-01-02T15:04:05Z07:00"
// - Without timezone: "2006-01-02T15:04:05"
// - Without seconds: "2006-01-02T15:04"
// - Date only: "2006-01-02"
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
	// Remove quotes
	s := strings.Trim(string(data), "\"")
	if s == "" || s == "null" {
		return nil
	}

	var parseErr error
	for _, format := range supportedFormats {
		t, err := time.Parse(format, s)
		if err == nil {
			ft.Time = t
			return nil
		}
		parseErr = err
	}

	return parseErr
}

func (ft FlexibleTime) MarshalJSON() ([]byte, error) {
	if ft.Time.IsZero() {
		return []byte("null"), nil
	}
	return []byte("\"" + ft.Time.Format(time.RFC3339) + "\""), nil
}

// ToTime converts FlexibleTime to standard time.Time
func (ft FlexibleTime) ToTime() time.Time {
	return ft.Time
}

// ToTimePtr converts FlexibleTime to *time.Time
func (ft *FlexibleTime) ToTimePtr() *time.Time {
	if ft == nil || ft.Time.IsZero() {
		return nil
	}
	t := ft.Time
	return &t
}
