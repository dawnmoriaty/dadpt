import type { Booking } from '../types'

const STORAGE_KEY = 'pending-booking-history-v1'
const MAX_ITEMS = 5

interface PendingBookingHistoryItem {
    code: string
    orderCode?: string
    updatedAt: string
}

function readHistory(): PendingBookingHistoryItem[] {
    if (typeof window === 'undefined') {
        return []
    }

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) {
            return []
        }
        const parsed = JSON.parse(raw) as PendingBookingHistoryItem[]
        if (!Array.isArray(parsed)) {
            return []
        }
        return parsed.filter((item) => typeof item?.code === 'string' && item.code.length > 0)
    } catch {
        return []
    }
}

function writeHistory(items: PendingBookingHistoryItem[]): void {
    if (typeof window === 'undefined') {
        return
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
}

export function upsertPendingBookingHistory(code: string, orderCode?: string): void {
    const safeCode = code.trim()
    if (!safeCode) {
        return
    }

    const current = readHistory()
    const filtered = current.filter((item) => item.code !== safeCode)
    filtered.unshift({ code: safeCode, orderCode: orderCode?.trim() || undefined, updatedAt: new Date().toISOString() })
    writeHistory(filtered)
}

export function syncPendingHistoryFromBookings(bookings: Booking[]): void {
    if (!Array.isArray(bookings) || bookings.length === 0) {
        return
    }

    const pending = bookings
        .filter((booking) => booking.status === 'pending')
        .slice(0, MAX_ITEMS)
        .map((booking) => ({
            code: booking.code,
            updatedAt: booking.updatedAt,
        }))

    if (pending.length === 0) {
        return
    }

    const existing = readHistory()
    const mergedMap = new Map<string, PendingBookingHistoryItem>()

    for (const item of pending) {
        mergedMap.set(item.code, item)
    }
    for (const item of existing) {
        if (!mergedMap.has(item.code)) {
            mergedMap.set(item.code, item)
        }
    }

    const merged = Array.from(mergedMap.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    writeHistory(merged)
}

export function getLatestPendingBookingFromHistory(): PendingBookingHistoryItem | null {
    const items = readHistory()
    if (items.length === 0) {
        return null
    }
    return items[0]
}

export function getPendingBookingFromHistory(code: string): PendingBookingHistoryItem | null {
    const safeCode = code.trim()
    if (!safeCode) {
        return null
    }
    const items = readHistory()
    return items.find((item) => item.code === safeCode) ?? null
}
