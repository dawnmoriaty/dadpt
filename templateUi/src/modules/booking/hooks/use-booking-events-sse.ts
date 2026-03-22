import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useAuthStore } from '@/stores/use-auth-store'

import { bookingKeys } from './query-keys'

const SSE_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'

interface BookingEventPayload {
    code: string
}

interface BookingEventEnvelope {
    eventType: string
    payload: BookingEventPayload
}

export function useBookingEventsSSE() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    const token = useAuthStore((s) => s.token)

    useEffect(() => {
        if (!token) {
            return
        }

        const es = new EventSource(`${SSE_BASE_URL}/bookings/events?token=${encodeURIComponent(token)}`)

        const handleEvent = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data) as BookingEventEnvelope
                queryClient.invalidateQueries({ queryKey: bookingKeys.all })

                switch (data.eventType) {
                    case 'booking.refund.approved':
                        toast.success(t('myBookings.eventRefundApproved', { code: data.payload.code }))
                        break
                    case 'booking.refund.rejected':
                        toast.warning(t('myBookings.eventRefundRejected', { code: data.payload.code }))
                        break
                    case 'booking.expired':
                        toast.warning(t('myBookings.eventExpired', { code: data.payload.code }))
                        break
                    case 'booking.cancelled':
                        toast.info(t('myBookings.eventCancelled', { code: data.payload.code }))
                        break
                    default:
                        break
                }
            } catch {
                queryClient.invalidateQueries({ queryKey: bookingKeys.all })
            }
        }

        es.addEventListener('booking_cancelled', handleEvent)
        es.addEventListener('refund_requested', handleEvent)
        es.addEventListener('refund_approved', handleEvent)
        es.addEventListener('refund_rejected', handleEvent)
        es.addEventListener('booking_expired', handleEvent)

        return () => {
            es.close()
        }
    }, [queryClient, t, token])
}
