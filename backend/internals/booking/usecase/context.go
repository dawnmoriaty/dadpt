package usecase

import (
	"context"
	"strings"
)

type contextKey string

const clientBaseURLContextKey contextKey = "client_base_url"

func WithClientBaseURL(ctx context.Context, baseURL string) context.Context {
	trimmed := strings.TrimSpace(baseURL)
	if trimmed == "" {
		return ctx
	}
	return context.WithValue(ctx, clientBaseURLContextKey, strings.TrimRight(trimmed, "/"))
}

func getClientBaseURL(ctx context.Context) string {
	v, ok := ctx.Value(clientBaseURLContextKey).(string)
	if !ok {
		return ""
	}
	return strings.TrimRight(strings.TrimSpace(v), "/")
}
