// Package i18n provides a data-driven internationalization engine.
//
// Architecture:
//   - Translation data is stored in JSON files under locales/ (one per language)
//   - Files are embedded at compile time via //go:embed
//   - A package-level Translator singleton is initialized once at startup via Init()
//   - The response layer calls T(lang, code) to resolve localized messages
//
// Adding a new language:
//  1. Create locales/<lang>.json with all error code keys
//  2. The Translator picks it up automatically on next build
//
// Thread safety: The Translator is read-only after Init(). Safe for concurrent use.
package i18n

import (
	"embed"
	"encoding/json"
	"strings"
	"sync"
)

//go:embed locales/*.json
var localeFS embed.FS

// Translator holds all locale data and resolves messages by (lang, code).
type Translator struct {
	// messages[lang][code] = translated message
	messages    map[string]map[string]string
	defaultLang string
	fallback    string
}

var (
	global *Translator
	once   sync.Once
)

// Init loads all locale files and initializes the global translator.
// Must be called once at application startup (e.g., in main or server init).
// Safe to call multiple times — only the first call takes effect.
func Init() {
	once.Do(func() {
		global = newTranslator("vi", "en")
	})
}

// T translates an error code to a localized message.
// Args is an optional map of placeholder replacements: {{key}} → value.
// Fallback chain: requested lang → default lang → fallback lang → raw code.
func T(lang, code string, args ...map[string]string) string {
	if global == nil {
		// Not initialized — return code as-is (safe for tests)
		return code
	}
	return global.Translate(lang, code, args...)
}

// ParseLang extracts the preferred language from an Accept-Language header value.
// Returns the best supported language or the default language.
func ParseLang(acceptLanguage string) string {
	if global == nil {
		return "vi"
	}
	return global.ParseLang(acceptLanguage)
}

// SupportedLangs returns the list of loaded language codes.
func SupportedLangs() []string {
	if global == nil {
		return nil
	}
	langs := make([]string, 0, len(global.messages))
	for lang := range global.messages {
		langs = append(langs, lang)
	}
	return langs
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

func newTranslator(defaultLang, fallback string) *Translator {
	t := &Translator{
		messages:    make(map[string]map[string]string),
		defaultLang: defaultLang,
		fallback:    fallback,
	}

	entries, err := localeFS.ReadDir("locales")
	if err != nil {
		// Embedded dir should always exist; panic indicates build problem.
		panic("i18n: cannot read embedded locales directory: " + err.Error())
	}

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}

		lang := strings.TrimSuffix(entry.Name(), ".json")
		data, err := localeFS.ReadFile("locales/" + entry.Name())
		if err != nil {
			panic("i18n: cannot read locale file " + entry.Name() + ": " + err.Error())
		}

		msgs := make(map[string]string)
		if err := json.Unmarshal(data, &msgs); err != nil {
			panic("i18n: invalid JSON in " + entry.Name() + ": " + err.Error())
		}

		t.messages[lang] = msgs
	}

	return t
}

// Translate resolves a localized message for the given language and code.
func (t *Translator) Translate(lang, code string, args ...map[string]string) string {
	msg := t.lookup(lang, code)

	// Replace {{key}} placeholders
	if len(args) > 0 && args[0] != nil {
		for k, v := range args[0] {
			msg = strings.ReplaceAll(msg, "{{"+k+"}}", v)
		}
	}

	return msg
}

// lookup tries: lang → defaultLang → fallback → code.
func (t *Translator) lookup(lang, code string) string {
	// Normalize language tag (e.g., "vi-VN" → "vi")
	lang = normalizeLang(lang)

	if msgs, ok := t.messages[lang]; ok {
		if msg, ok := msgs[code]; ok {
			return msg
		}
	}

	if lang != t.defaultLang {
		if msgs, ok := t.messages[t.defaultLang]; ok {
			if msg, ok := msgs[code]; ok {
				return msg
			}
		}
	}

	if t.fallback != "" && t.fallback != lang && t.fallback != t.defaultLang {
		if msgs, ok := t.messages[t.fallback]; ok {
			if msg, ok := msgs[code]; ok {
				return msg
			}
		}
	}

	// No translation found — return the code itself
	return code
}

// ParseLang extracts the best supported language from an Accept-Language header.
// Handles formats like: "vi", "en-US", "en-US,en;q=0.9,vi;q=0.8"
func (t *Translator) ParseLang(acceptLanguage string) string {
	if acceptLanguage == "" {
		return t.defaultLang
	}

	// Split by comma, try each in order of priority (already ordered by q-value convention)
	parts := strings.Split(acceptLanguage, ",")
	for _, part := range parts {
		// Strip quality value: "en-US;q=0.9" → "en-US"
		lang := strings.TrimSpace(strings.SplitN(part, ";", 2)[0])
		lang = normalizeLang(lang)

		if _, ok := t.messages[lang]; ok {
			return lang
		}
	}

	return t.defaultLang
}

// normalizeLang extracts the primary language subtag: "en-US" → "en", "vi-VN" → "vi".
func normalizeLang(lang string) string {
	lang = strings.TrimSpace(strings.ToLower(lang))
	if idx := strings.IndexAny(lang, "-_"); idx > 0 {
		lang = lang[:idx]
	}
	return lang
}
