package i18n

import (
	"embed"
	"encoding/json"
	"strings"
	"sync"
)

//go:embed locales/*.json
var localeFS embed.FS

type Translator struct {
	messages    map[string]map[string]string
	defaultLang string
	fallback    string
}

var (
	global *Translator
	once   sync.Once
)

func Init() {
	once.Do(func() {
		global = newTranslator("vi", "en")
	})
}

func T(lang, code string, args ...map[string]string) string {
	if global == nil {
		return code
	}
	return global.Translate(lang, code, args...)
}

func ParseLang(acceptLanguage string) string {
	if global == nil {
		return "vi"
	}
	return global.ParseLang(acceptLanguage)
}

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


func newTranslator(defaultLang, fallback string) *Translator {
	t := &Translator{
		messages:    make(map[string]map[string]string),
		defaultLang: defaultLang,
		fallback:    fallback,
	}

	entries, err := localeFS.ReadDir("locales")
	if err != nil {
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

func (t *Translator) Translate(lang, code string, args ...map[string]string) string {
	msg := t.lookup(lang, code)

	if len(args) > 0 && args[0] != nil {
		for k, v := range args[0] {
			msg = strings.ReplaceAll(msg, "{{"+k+"}}", v)
		}
	}

	return msg
}

func (t *Translator) lookup(lang, code string) string {
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

	return code
}

func (t *Translator) ParseLang(acceptLanguage string) string {
	if acceptLanguage == "" {
		return t.defaultLang
	}

	parts := strings.Split(acceptLanguage, ",")
	for _, part := range parts {
		lang := strings.TrimSpace(strings.SplitN(part, ";", 2)[0])
		lang = normalizeLang(lang)

		if _, ok := t.messages[lang]; ok {
			return lang
		}
	}

	return t.defaultLang
}

func normalizeLang(lang string) string {
	lang = strings.TrimSpace(strings.ToLower(lang))
	if idx := strings.IndexAny(lang, "-_"); idx > 0 {
		lang = lang[:idx]
	}
	return lang
}
