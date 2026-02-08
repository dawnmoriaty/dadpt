/**
 * Centralized validation messages for Zod schemas.
 * All user-facing validation strings are resolved via i18next.
 *
 * Usage:
 *   import { V } from '@/lib/validation/messages'
 *   z.string().min(2, V.min('field.name', 2))
 *
 * Note: `field` parameters should be i18n keys (e.g. 'field.name')
 * so the field label itself gets translated.
 */

import i18n from '@/lib/i18n'

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(key, opts)

// ---------------------------------------------------------------------------
// Common message factories
// ---------------------------------------------------------------------------

export const V = {
    /** Field is required */
    required: (field: string) => t('validation.required', { field: t(field) }),

    /** Minimum string length */
    min: (field: string, n: number) => t('validation.min', { field: t(field), min: n }),

    /** Maximum string length */
    max: (field: string, n: number) => t('validation.max', { field: t(field), max: n }),

    /** Short alias when only "too long" is needed */
    tooLong: (field: string) => t('validation.tooLong', { field: t(field) }),

    /** Minimum numeric value */
    minNum: (field: string, n: number) => t('validation.minNum', { field: t(field), min: n }),

    /** Maximum numeric value */
    maxNum: (field: string, n: number) => t('validation.maxNum', { field: t(field), max: n }),

    /** Numeric range: >= min */
    gte: (field: string, n: number) => t('validation.gte', { field: t(field), min: n }),

    /** Invalid email format */
    get email() {
        return t('validation.email')
    },

    /** Invalid Vietnamese phone number */
    get phone() {
        return t('validation.phone')
    },

    /** Vietnamese phone number format hint */
    get phoneMin() {
        return t('validation.phoneMin')
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    invalidFormat: (field: string, _hint?: string) => t('validation.invalidFormat', { field: t(field) }),
} as const
