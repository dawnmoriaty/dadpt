import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import vi from './locales/vi.json'

export const defaultNS = 'translation' as const

const resources = {
    vi: { translation: vi },
    en: { translation: en },
} as const

i18n.use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        defaultNS,
        lng: 'vi',
        fallbackLng: 'vi',
        supportedLngs: ['vi', 'en'],
        interpolation: {
            escapeValue: false, // React already escapes
        },
        detection: {
            order: ['localStorage'],
            caches: ['localStorage'],
            lookupLocalStorage: 'i18nextLng',
        },
    })

export default i18n
