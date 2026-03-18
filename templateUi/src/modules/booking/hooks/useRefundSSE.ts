import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useAuthStore } from '@/stores/use-auth-store'

import { adminBookingKeys } from '.'

const SSE_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'

interface RefundEvent {
    eventType: string
    bookingId: number
    code: string
    tripId: number
    seatCodes: string[]
    amount: number
    status: string
    guestName: string
    guestPhone: string
}

/**
 * useRefundSSE connects to the admin SSE endpoint to receive real-time
 * refund request notifications. On each event:
 * - Invalidates refund request queries (auto-refresh table)
 * - Invalidates refund pending count (auto-update badge)
 * - Shows a toast notification with booking details
 */
export function useRefundSSE() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    const token = useAuthStore((s) => s.token)
    const eventSourceRef = useRef<EventSource | null>(null)

    useEffect(() => {
        if (!token) return

        const url = `${SSE_BASE_URL}/admin/bookings/refund-events?token=${encodeURIComponent(token)}`
        const es = new EventSource(url)
        eventSourceRef.current = es

        es.addEventListener('connected', () => {
            console.log('[SSE] Connected to refund events stream')
        })

        es.addEventListener('refund_requested', (event) => {
            try {
                const data: RefundEvent = JSON.parse(event.data)
                console.log('[SSE] Received refund event:', data)

                // Invalidate queries to auto-refresh the admin refund list and badge
                queryClient.invalidateQueries({ queryKey: ['admin-refund-requests'] })
                queryClient.invalidateQueries({ queryKey: adminBookingKeys.refundPendingCount })

                // Show toast notification
                const amountFormatted = new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND',
                }).format(data.amount)

                toast.info(
                    t('adminRefund.newRequest', {
                        code: data.code,
                        name: data.guestName,
                        amount: amountFormatted,
                        defaultValue: `Yêu cầu hoàn tiền mới: ${data.code} - ${data.guestName} (${amountFormatted})`,
                    }),
                    { duration: 8000 },
                )
            } catch (err) {
                console.error('[SSE] Failed to parse refund event:', err)
            }
        })

        es.onerror = (err) => {
            console.warn('[SSE] Connection error, will retry:', err)
        }

        return () => {
            es.close()
            eventSourceRef.current = null
            console.log('[SSE] Disconnected from refund events stream')
        }
    }, [token, queryClient, t])
}
