import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { getApiErrorMessage } from '@/services/api/client'

import { adminBookingApi } from '../api'
import type { Booking, RefundActionRequest, RefundRequestListResponse } from '../types'

import { bookingKeys, refundRequestKeys, type RefundRequestEventFeedItem } from './query-keys'

export function useRefundRequestEventFeed() {
    return useQuery<RefundRequestEventFeedItem[]>({
        queryKey: refundRequestKeys.eventFeed,
        queryFn: async (): Promise<RefundRequestEventFeedItem[]> => [],
        staleTime: Infinity,
        gcTime: Infinity,
    })
}

export function useRefundRequests(page = 1, pageSize = 10) {
    return useQuery<RefundRequestListResponse>({
        queryKey: refundRequestKeys.list(page, pageSize),
        queryFn: () => adminBookingApi.listRefundRequests(page, pageSize),
    })
}

export function useRefundPendingCount() {
    return useQuery<{ count: number }>({
        queryKey: refundRequestKeys.pendingCount,
        queryFn: () => adminBookingApi.countRefundPending(),
    })
}

export function useApproveRefund() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()

    return useMutation<Booking, Error, { id: number; data?: RefundActionRequest }>({
        mutationFn: ({ id, data }) => adminBookingApi.approveRefund(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: refundRequestKeys.root })
            queryClient.invalidateQueries({ queryKey: refundRequestKeys.pendingCount })
            queryClient.invalidateQueries({ queryKey: bookingKeys.all })
            toast.success(t('refundRequests.approveSuccess'))
        },
        onError: (error: Error) => {
            toast.error(getApiErrorMessage(error, t('refundRequests.approveError')))
        },
    })
}

export function useRejectRefund() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()

    return useMutation<Booking, Error, { id: number; data?: RefundActionRequest }>({
        mutationFn: ({ id, data }) => adminBookingApi.rejectRefund(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: refundRequestKeys.root })
            queryClient.invalidateQueries({ queryKey: refundRequestKeys.pendingCount })
            queryClient.invalidateQueries({ queryKey: bookingKeys.all })
            toast.success(t('refundRequests.rejectSuccess'))
        },
        onError: (error: Error) => {
            toast.error(getApiErrorMessage(error, t('refundRequests.rejectError')))
        },
    })
}
