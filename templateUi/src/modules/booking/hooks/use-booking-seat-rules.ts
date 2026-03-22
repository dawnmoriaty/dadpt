import { useMemo } from 'react'

import type { Booking, BookingStatus } from '../types'

const ACTIVE_STATUSES: BookingStatus[] = ['pending', 'paid', 'refund_pending']
const MAX_SEATS_PER_USER_PER_TRIP = 4

function normalizeSeatCode(code: string): string {
    const value = code.trim().toUpperCase()
    const match = value.match(/^([A-Z]+)(\d+)$/)
    if (!match) return value
    return `${match[1]}${match[2].padStart(2, '0')}`
}

export interface BookingSeatRules {
    userExistingSeats: string[]
    maxAdditionalSeats: number
}

export function useBookingSeatRules(tripId: number, bookings: Booking[] | undefined): BookingSeatRules {
    return useMemo(() => {
        const userExistingSeatSet = new Set<string>()

        for (const booking of bookings ?? []) {
            if (booking.tripId !== tripId) continue
            if (!ACTIVE_STATUSES.includes(booking.status)) continue
            for (const seatCode of booking.seatCodes) {
                userExistingSeatSet.add(normalizeSeatCode(seatCode))
            }
        }

        const userExistingSeats = Array.from(userExistingSeatSet)
        const remainingSeats = Math.max(MAX_SEATS_PER_USER_PER_TRIP - userExistingSeats.length, 0)

        return {
            userExistingSeats,
            maxAdditionalSeats: remainingSeats,
        }
    }, [bookings, tripId])
}
