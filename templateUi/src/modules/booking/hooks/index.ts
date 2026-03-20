import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { getApiErrorMessage } from '@/services/api/client'

import { bookingApi, adminBookingApi } from '../api'
import type { Booking, CreateBookingRequest, CreateBookingResponse, RefundActionRequest, RefundRequestListResponse } from '../types'

export { useRefundSSE } from './useRefundSSE'

export const bookingKeys = {
    all: ['bookings'] as const,
    mine: (page: number, pageSize: number) => [...bookingKeys.all, 'mine', page, pageSize] as const,
    detail: (id: number) => [...bookingKeys.all, 'detail', id] as const,
    code: (code: string) => [...bookingKeys.all, 'code', code] as const,
    searchTrips: (params: Record<string, unknown>) => [...bookingKeys.all, 'trip-search', params] as const,
    paymentStatus: (orderCode: string) => [...bookingKeys.all, 'payment-status', orderCode] as const,
}

export function useMyBookings(page = 1, pageSize = 20) {
    return useQuery({
        queryKey: bookingKeys.mine(page, pageSize),
        queryFn: () => bookingApi.listMine(page, pageSize),
    })
}

export function useBooking(id: number) {
    return useQuery({
        queryKey: bookingKeys.detail(id),
        queryFn: () => bookingApi.getById(id),
        enabled: id > 0,
    })
}

export function useBookingByCode(code: string) {
    return useQuery({
        queryKey: bookingKeys.code(code),
        queryFn: () => bookingApi.getByCode(code),
        enabled: code.length > 0,
    })
}

export function useCreateBooking() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()

    return useMutation<CreateBookingResponse, Error, CreateBookingRequest>({
        mutationFn: (data: CreateBookingRequest) => bookingApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bookingKeys.all })
            toast.success(t('toast.createSuccess', { entity: t('entity.booking') }))
        },
        onError: (error: Error) => {
            toast.error(getApiErrorMessage(error, t('toast.createError', { entity: t('entity.booking') })))
        },
    })
}

export function useCancelBooking() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()

    return useMutation<Booking, Error, { id: number; isRefund: boolean }>({
        mutationFn: ({ id }) => bookingApi.cancel(id),
        onSuccess: (_data, { isRefund }) => {
            queryClient.invalidateQueries({ queryKey: bookingKeys.all })
            if (isRefund) {
                toast.success(t('myBookings.refundRequested'))
            } else {
                toast.success(t('toast.deleteSuccess', { entity: t('entity.booking') }))
            }
        },
        onError: (error: Error, { isRefund }) => {
            if (isRefund) {
                toast.error(getApiErrorMessage(error, t('myBookings.refundError')))
            } else {
                toast.error(getApiErrorMessage(error, t('toast.deleteError', { entity: t('entity.booking') })))
            }
        },
    })
}

export function useSearchTrips(params: {
    originId: number
    destinationId: number
    departureDate: string
    minSeats?: number
}) {
    return useQuery({
        queryKey: bookingKeys.searchTrips(params),
        queryFn: () => bookingApi.searchTrips(params),
        enabled: params.originId > 0 && params.destinationId > 0 && params.departureDate.length > 0,
    })
}

export function useBrowseTrips(params?: {
    providerIds?: number[]
    busTypeIds?: number[]
    page?: number
    limit?: number
}) {
    return useQuery({
        queryKey: [...bookingKeys.all, 'browse-trips', params] as const,
        queryFn: () => bookingApi.browseTrips(params),
    })
}

export function usePaymentStatus(orderCode: string, enabled: boolean) {
    return useQuery({
        queryKey: bookingKeys.paymentStatus(orderCode),
        queryFn: () => bookingApi.getPaymentStatus(orderCode),
        enabled: enabled && orderCode.length > 0,
        refetchInterval: (query) => {
            const status = query.state.data?.status
            if (status === 'success' || status === 'failed') return false
            return 5000
        },
    })
}

// =============================================================================
// ADMIN REFUND HOOKS
// =============================================================================

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

export function pushAdminBookingEvent(queryClient: ReturnType<typeof useQueryClient>, event: Omit<AdminBookingEventFeedItem, 'id' | 'createdAt'>) {
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

export function useAdminBookingEventFeed() {
    return useQuery<AdminBookingEventFeedItem[]>({
        queryKey: adminBookingKeys.eventFeed,
        queryFn: async () => [],
        staleTime: Infinity,
        gcTime: Infinity,
    })
}

export function useRefundRequests(page = 1, pageSize = 20) {
    return useQuery<RefundRequestListResponse>({
        queryKey: adminBookingKeys.refundRequests(page, pageSize),
        queryFn: () => adminBookingApi.listRefundRequests(page, pageSize),
    })
}

export function useRefundPendingCount() {
    return useQuery<{ count: number }>({
        queryKey: adminBookingKeys.refundPendingCount,
        queryFn: () => adminBookingApi.countRefundPending(),
    })
}

export function useApproveRefund() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()

    return useMutation<Booking, Error, { id: number; data?: RefundActionRequest }>({
        mutationFn: ({ id, data }) => adminBookingApi.approveRefund(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-refund-requests'] })
            queryClient.invalidateQueries({ queryKey: adminBookingKeys.refundPendingCount })
            queryClient.invalidateQueries({ queryKey: bookingKeys.all })
            toast.success(t('adminRefund.approveSuccess'))
        },
        onError: (error: Error) => {
            toast.error(getApiErrorMessage(error, t('adminRefund.approveError')))
        },
    })
}

export function useRejectRefund() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()

    return useMutation<Booking, Error, { id: number; data?: RefundActionRequest }>({
        mutationFn: ({ id, data }) => adminBookingApi.rejectRefund(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-refund-requests'] })
            queryClient.invalidateQueries({ queryKey: adminBookingKeys.refundPendingCount })
            queryClient.invalidateQueries({ queryKey: bookingKeys.all })
            toast.success(t('adminRefund.rejectSuccess'))
        },
        onError: (error: Error) => {
            toast.error(getApiErrorMessage(error, t('adminRefund.rejectError')))
        },
    })
}
