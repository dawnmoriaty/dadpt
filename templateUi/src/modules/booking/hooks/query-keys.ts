import type { QueryClient } from '@tanstack/react-query'

export const bookingKeys = {
    all: ['bookings'] as const,
    mine: (page: number, pageSize: number) => [...bookingKeys.all, 'mine', page, pageSize] as const,
    detail: (id: number) => [...bookingKeys.all, 'detail', id] as const,
    code: (code: string) => [...bookingKeys.all, 'code', code] as const,
    searchTrips: (params: Record<string, unknown>) => [...bookingKeys.all, 'trip-search', params] as const,
    paymentStatus: (orderCode: string) => [...bookingKeys.all, 'payment-status', orderCode] as const,
}

export const adminBookingKeys = {
    refundRequests: (page: number, pageSize: number) => ['admin-refund-requests', page, pageSize] as const,
    refundPendingCount: ['admin-refund-pending-count'] as const,
    eventFeed: ['admin-booking-event-feed'] as const,
}

export interface AdminBookingEventFeedItem {
    id: string
    type: 'refund_requested' | 'booking_cancelled'
    code: string
    guestName: string
    amount: number
    createdAt: string
}

const MAX_EVENT_FEED_ITEMS = 20

export function pushAdminBookingEvent(queryClient: QueryClient, event: Omit<AdminBookingEventFeedItem, 'id' | 'createdAt'>) {
    const nextItem: AdminBookingEventFeedItem = {
        ...event,
        id: `${event.type}-${event.code}-${Date.now()}`,
        createdAt: new Date().toISOString(),
    }

    queryClient.setQueryData<AdminBookingEventFeedItem[]>(adminBookingKeys.eventFeed, (prev = []) => {
        const next = [nextItem, ...prev]
        return next.slice(0, MAX_EVENT_FEED_ITEMS)
    })
}
