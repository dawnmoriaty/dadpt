// Package typeconv provides type conversion utilities for pgx/v5 types
// and nullable pointer types commonly used with SQLC generated code.
package typeconv

import (
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

// =============================================================================
// NUMERIC CONVERSIONS
// =============================================================================

// NumericToFloat64 converts pgtype.Numeric to float64
func NumericToFloat64(n pgtype.Numeric) float64 {
	f, _ := n.Float64Value()
	return f.Float64
}

// Float64ToNumeric converts float64 to pgtype.Numeric with 2 decimal precision
func Float64ToNumeric(f float64) pgtype.Numeric {
	var n pgtype.Numeric
	_ = n.Scan(fmt.Sprintf("%.2f", f))
	return n
}

// =============================================================================
// POINTER CONVERSIONS - String
// =============================================================================

// PtrToString converts *string to string, returns empty string for nil
func PtrToString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// StringToPtr converts string to *string, returns nil for empty string
func StringToPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// =============================================================================
// POINTER CONVERSIONS - Bool
// =============================================================================

// PtrToBool converts *bool to bool, returns false for nil
func PtrToBool(b *bool) bool {
	if b == nil {
		return false
	}
	return *b
}

// BoolToPtr converts bool to *bool
func BoolToPtr(b bool) *bool {
	return &b
}

// =============================================================================
// POINTER CONVERSIONS - Int32
// =============================================================================

// PtrToInt32 converts *int32 to int32, returns 0 for nil
func PtrToInt32(i *int32) int32 {
	if i == nil {
		return 0
	}
	return *i
}

// Int32ToPtr converts int32 to *int32
func Int32ToPtr(i int32) *int32 {
	return &i
}

// =============================================================================
// POINTER CONVERSIONS - Int64
// =============================================================================

// PtrToInt64 converts *int64 to int64, returns 0 for nil
func PtrToInt64(i *int64) int64 {
	if i == nil {
		return 0
	}
	return *i
}

// Int64ToPtr converts int64 to *int64
func Int64ToPtr(i int64) *int64 {
	return &i
}

// =============================================================================
// TIMESTAMP CONVERSIONS
// =============================================================================

// TimeToTimestamptz converts time.Time to pgtype.Timestamptz
func TimeToTimestamptz(t time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{
		Time:  t,
		Valid: !t.IsZero(),
	}
}

// TimestamptzToTime converts pgtype.Timestamptz to time.Time
func TimestamptzToTime(ts pgtype.Timestamptz) time.Time {
	if !ts.Valid {
		return time.Time{}
	}
	return ts.Time
}
