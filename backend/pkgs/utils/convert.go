// Package utils provides common conversion helpers used across the application.
// Consolidates: typeconv (pointer/pgx conversions) + datetime (FlexibleTime).
package utils

import (
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

// ---------------------------------------------------------------------------
// Pointer ↔ Value — generic helpers (Go 1.18+)
// ---------------------------------------------------------------------------

// Ptr returns a pointer to the given value.
func Ptr[T any](v T) *T { return &v }

// Val dereferences a pointer, returning the zero value when nil.
func Val[T any](p *T) T {
	if p == nil {
		var zero T
		return zero
	}
	return *p
}

// ---------------------------------------------------------------------------
// Pointer ↔ Value — typed shortcuts for readability
// ---------------------------------------------------------------------------

// PtrToString returns "" when s is nil.
func PtrToString(s *string) string { return Val(s) }

// StringToPtr returns nil when s is "".
func StringToPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// PtrToBool returns false when b is nil.
func PtrToBool(b *bool) bool { return Val(b) }

// BoolToPtr returns a pointer to b.
func BoolToPtr(b bool) *bool { return Ptr(b) }

// PtrToInt32 returns 0 when i is nil.
func PtrToInt32(i *int32) int32 { return Val(i) }

// Int32ToPtr returns a pointer to i.
func Int32ToPtr(i int32) *int32 { return Ptr(i) }

// PtrToInt64 returns 0 when i is nil.
func PtrToInt64(i *int64) int64 { return Val(i) }

// Int64ToPtr returns a pointer to i.
func Int64ToPtr(i int64) *int64 { return Ptr(i) }

// ---------------------------------------------------------------------------
// pgtype.Numeric ↔ float64
// ---------------------------------------------------------------------------

// NumericToFloat64 converts pgtype.Numeric to float64.
func NumericToFloat64(n pgtype.Numeric) float64 {
	f, _ := n.Float64Value()
	return f.Float64
}

// Float64ToNumeric converts float64 to pgtype.Numeric (2 decimal places).
func Float64ToNumeric(f float64) pgtype.Numeric {
	var n pgtype.Numeric
	_ = n.Scan(fmt.Sprintf("%.2f", f))
	return n
}

// ---------------------------------------------------------------------------
// pgtype.Timestamptz ↔ time.Time
// ---------------------------------------------------------------------------

// TimeToTimestamptz wraps a time.Time into pgtype.Timestamptz.
func TimeToTimestamptz(t time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: t, Valid: !t.IsZero()}
}

// TimeToDate wraps a time.Time into pgtype.Date.
func TimeToDate(t time.Time) pgtype.Date {
	return pgtype.Date{Time: t, Valid: !t.IsZero()}
}

// TimestamptzToTime unwraps pgtype.Timestamptz; returns zero-time if invalid.
func TimestamptzToTime(ts pgtype.Timestamptz) time.Time {
	if !ts.Valid {
		return time.Time{}
	}
	return ts.Time
}
