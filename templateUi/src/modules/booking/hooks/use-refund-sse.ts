import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useAuthStore } from '@/stores/use-auth-store'

import { pushRefundRequestEvent, refundRequestKeys } from './query-keys'

const SSE_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'

interface RefundRequestEvent {
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
 * useRefundSSE connects to the refund SSE endpoint to receive real-time
 * refund request notifications. On each event:
 * - Invalidates refund request queries (auto-refresh table)
 * - Invalidates refund pending count (auto-update badge)
 * - Shows a toast notification with booking details
 */
export function useRefundSSE() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    const token = useAuthStore((s) => s.token)

    useEffect(() => {
        if (!token) return

        const controller = new AbortController()
        let closed = false

        const connect = async () => {
            while (!closed) {
                try {
                    const response = await fetch(`${SSE_BASE_URL}/admin/bookings/refund-events`, {
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
                                const data: RefundRequestEvent = JSON.parse(rawData)

                                queryClient.invalidateQueries({ queryKey: refundRequestKeys.root })
                                queryClient.invalidateQueries({ queryKey: refundRequestKeys.pendingCount })

                                const amountFormatted = new Intl.NumberFormat('vi-VN', {
                                    style: 'currency',
                                    currency: 'VND',
                                }).format(data.amount)

                                toast.info(
                                    t('refundRequests.newRequest', {
                                        code: data.code,
                                        name: data.guestName,
                                        amount: amountFormatted,
                                        defaultValue: `Yêu cầu hoàn tiền mới: ${data.code} - ${data.guestName} (${amountFormatted})`,
                                    }),
                                    { duration: 8000 },
                                )

                                pushRefundRequestEvent(queryClient, {
                                    type: 'refund_requested',
                                    code: data.code,
                                    guestName: data.guestName,
                                    amount: data.amount,
                                })
                            } catch {
                                queryClient.invalidateQueries({ queryKey: refundRequestKeys.root })
                            }

                            splitIndex = buffer.indexOf('\n\n')
                        }
                    }
                } catch (err) {
                    if (closed) {
                        break
                    }
                    console.warn('[SSE] Connection error, will retry:', err)
                    await new Promise((resolve) => setTimeout(resolve, 1500))
                }
            }
        }

        void connect()

        return () => {
            closed = true
            controller.abort()
        }
    }, [token, queryClient, t])
}
