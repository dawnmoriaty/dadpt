import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { getApiErrorMessage } from '@/services/api/client'

import { adminBookingApi } from '../api'
import type { Booking, RefundActionRequest, RefundRequestListResponse } from '../types'

import { adminBookingKeys, bookingKeys, type AdminBookingEventFeedItem } from './query-keys'

export function useAdminBookingEventFeed() {
    return useQuery<AdminBookingEventFeedItem[]>({
        queryKey: adminBookingKeys.eventFeed,
        queryFn: async (): Promise<AdminBookingEventFeedItem[]> => [],
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
