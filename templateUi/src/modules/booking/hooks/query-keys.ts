import type { QueryClient } from '@tanstack/react-query'

export const bookingKeys = {
    all: ['bookings'] as const,
    mine: (page: number, pageSize: number) => [...bookingKeys.all, 'mine', page, pageSize] as const,
    detail: (id: number) => [...bookingKeys.all, 'detail', id] as const,
    code: (code: string) => [...bookingKeys.all, 'code', code] as const,
    searchTrips: (params: Record<string, unknown>) => [...bookingKeys.all, 'trip-search', params] as const,
    paymentStatus: (orderCode: string) => [...bookingKeys.all, 'payment-status', orderCode] as const,
}

export const refundRequestKeys = {
    root: ['refund-requests'] as const,
    list: (page: number, pageSize: number) => ['refund-requests', page, pageSize] as const,
    pendingCount: ['refund-pending-count'] as const,
    eventFeed: ['refund-request-event-feed'] as const,
}

export const adminBookingKeys = {
    root: ['admin-bookings'] as const,
    list: (params: Record<string, unknown>) => ['admin-bookings', 'list', params] as const,
    stats: ['admin-bookings', 'stats'] as const,
    tripSeats: (tripId: number) => ['admin-bookings', 'trip-seats', tripId] as const,
    detail: (bookingId: number) => ['admin-bookings', 'detail', bookingId] as const,
    revenueSeries: (days: number) => ['admin-bookings', 'revenue-series', days] as const,
}

export interface RefundRequestEventFeedItem {
    id: string
    type: 'refund_requested' | 'booking_cancelled'
    code: string
    guestName: string
    amount: number
    createdAt: string
}

const MAX_EVENT_FEED_ITEMS = 20

export function pushRefundRequestEvent(queryClient: QueryClient, event: Omit<RefundRequestEventFeedItem, 'id' | 'createdAt'>) {
    const nextItem: RefundRequestEventFeedItem = {
        ...event,
        id: `${event.type}-${event.code}-${Date.now()}`,
        createdAt: new Date().toISOString(),
    }

    queryClient.setQueryData<RefundRequestEventFeedItem[]>(refundRequestKeys.eventFeed, (prev = []) => {
        const next = [nextItem, ...prev]
        return next.slice(0, MAX_EVENT_FEED_ITEMS)
    })
}
