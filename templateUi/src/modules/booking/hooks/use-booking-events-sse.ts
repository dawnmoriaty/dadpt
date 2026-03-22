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

        const controller = new AbortController()
        let closed = false

        const connect = async () => {
            while (!closed) {
                try {
                    const response = await fetch(`${SSE_BASE_URL}/bookings/events`, {
                        method: 'GET',
                        headers: {
                            Accept: 'text/event-stream',
                            Authorization: `Bearer ${token}`,
                        },
                        signal: controller.signal,
                    })

                    if (!response.ok || !response.body) {
                        throw new Error(`SSE failed: ${response.status}`)
                    }

                    const reader = response.body.getReader()
                    const decoder = new TextDecoder()
                    let buffer = ''

                    while (!closed) {
                        const { value, done } = await reader.read()
                        if (done) break
                        buffer += decoder.decode(value, { stream: true })

                        let splitIndex = buffer.indexOf('\n\n')
                        while (splitIndex !== -1) {
                            const rawEvent = buffer.slice(0, splitIndex)
                            buffer = buffer.slice(splitIndex + 2)

                            const lines = rawEvent.split('\n')
                            let eventType = ''
                            const dataLines: string[] = []
                            for (const line of lines) {
                                if (line.startsWith('event:')) {
                                    eventType = line.slice(6).trim()
                                } else if (line.startsWith('data:')) {
                                    dataLines.push(line.slice(5).trim())
                                }
                            }

                            if (eventType === 'connected') {
                                splitIndex = buffer.indexOf('\n\n')
                                continue
                            }

                            const rawData = dataLines.join('\n')
                            if (!rawData) {
                                splitIndex = buffer.indexOf('\n\n')
                                continue
                            }

                            try {
                                const data = JSON.parse(rawData) as BookingEventEnvelope
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

                            splitIndex = buffer.indexOf('\n\n')
                        }
                    }
                } catch {
                    if (closed) {
                        break
                    }
                    await new Promise((resolve) => setTimeout(resolve, 1500))
                }
            }
        }

        void connect()

        return () => {
            closed = true
            controller.abort()
        }
    }, [queryClient, t, token])
}
