import type { Location } from '../types'

function normalizeSpaces(value: string | undefined): string {
    return (value ?? '').trim().replace(/\s+/g, ' ')
}

function toTitleCase(value: string): string {
    return value
        .toLocaleLowerCase('vi-VN')
        .split(' ')
        .filter((token) => token.length > 0)
        .map((token) => token.charAt(0).toLocaleUpperCase('vi-VN') + token.slice(1))
        .join(' ')
}

export function normalizeCityLabel(value: string): string {
    const compact = normalizeSpaces(value)
    if (compact.length === 0) {
        return compact
    }

    const stripped = compact.replace(/^(thành\s*phố|thanh\s*pho|tp\.?|tỉnh|tinh)\s+/iu, '')
    return toTitleCase(normalizeSpaces(stripped))
}

export function normalizeLocationItem(location: Location): Location {
    return {
        ...location,
        name: normalizeSpaces(location.name),
        city: normalizeCityLabel(location.city),
        address: normalizeSpaces(location.address),
        keywords: normalizeSpaces(location.keywords),
    }
}
