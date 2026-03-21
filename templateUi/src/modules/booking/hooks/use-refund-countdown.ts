import { useEffect, useState } from 'react'

import type { Booking } from '../types'

const REFUND_WINDOW_MS = 5 * 60 * 1000

function getRefundRemainingMs(booking: Booking): number {
    if (booking.status !== 'paid') {
        return 0
    }

    const paidAt = new Date(booking.updatedAt).getTime()
    const deadline = paidAt + REFUND_WINDOW_MS

    return Math.max(0, deadline - Date.now())
}

export function useRefundCountdown(booking: Booking) {
    const [remainingMs, setRemainingMs] = useState(() => getRefundRemainingMs(booking))

    useEffect(() => {
        if (booking.status !== 'paid') {
            return
        }

        const update = () => setRemainingMs(getRefundRemainingMs(booking))
        update()

        const intervalId = setInterval(update, 1000)

        return () => clearInterval(intervalId)
    }, [booking])

    return remainingMs
}
