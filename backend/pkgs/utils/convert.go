package utils

import (
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)


func Ptr[T any](v T) *T { return &v }

func Val[T any](p *T) T {
	if p == nil {
		var zero T
		return zero
	}
	return *p
}


func PtrToString(s *string) string { return Val(s) }

func StringToPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func PtrToBool(b *bool) bool { return Val(b) }

func BoolToPtr(b bool) *bool { return Ptr(b) }

func PtrToInt32(i *int32) int32 { return Val(i) }

func Int32ToPtr(i int32) *int32 { return Ptr(i) }

func PtrToInt64(i *int64) int64 { return Val(i) }

func Int64ToPtr(i int64) *int64 { return Ptr(i) }


func NumericToFloat64(n pgtype.Numeric) float64 {
	f, _ := n.Float64Value()
	return f.Float64
}

func Float64ToNumeric(f float64) pgtype.Numeric {
	var n pgtype.Numeric
	_ = n.Scan(fmt.Sprintf("%.2f", f))
	return n
}


func TimeToTimestamptz(t time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: t, Valid: !t.IsZero()}
}

func TimeToDate(t time.Time) pgtype.Date {
	return pgtype.Date{Time: t, Valid: !t.IsZero()}
}

func TimestamptzToTime(ts pgtype.Timestamptz) time.Time {
	if !ts.Valid {
		return time.Time{}
	}
	return ts.Time
}
