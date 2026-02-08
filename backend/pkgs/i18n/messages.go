// Package i18n provides internationalization for the Bus Ticketing Backend.
//
// Architecture:
//   - Error codes (from pkgs/errors) serve as translation keys
//   - Locale JSON files in locales/ provide translations per language
//   - The Translator resolves (lang, code) → localized message at the HTTP edge
//   - Domain layer uses plain English sentinel errors, NOT i18n messages
//
// Usage:
//
//	i18n.Init()                          // once at startup
//	msg := i18n.T("vi", "INVALID_PHONE") // → "Số điện thoại không đúng định dạng Việt Nam"
//	lang := i18n.ParseLang(r.Header.Get("Accept-Language"))
//
// Adding a new language:
//  1. Create locales/<lang>.json with all error code keys
//  2. Rebuild — the translator picks it up via //go:embed
package i18n
