package http

import (
	"strings"
	"time"
)

func normalizeVoiceTravelDate(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "auto"
	}

	normalized := normalizeLocationText(trimmed)
	switch normalized {
	case "auto", "gan nhat", "som nhat":
		return "auto"
	case "hom nay":
		return time.Now().Format("2006-01-02")
	case "ngay mai", "mai":
		return time.Now().AddDate(0, 0, 1).Format("2006-01-02")
	case "ngay kia", "mot":
		return time.Now().AddDate(0, 0, 2).Format("2006-01-02")
	default:
		return trimmed
	}
}

func fallbackName(primary, fallback string) string {
	if strings.TrimSpace(primary) != "" {
		return primary
	}
	return strings.TrimSpace(fallback)
}
