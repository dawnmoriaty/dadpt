import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { getApiErrorMessage } from '@/services/api/client'

import { bookingApi } from '../api'
import type { Booking, CreateBookingRequest, CreateBookingResponse, PaymentStatusResponse } from '../types'

import { bookingKeys } from './query-keys'

export function useMyBookings(page = 1, pageSize = 10, enabled = true) {
    return useQuery({
        queryKey: bookingKeys.mine(page, pageSize),
        queryFn: () => bookingApi.listMine(page, pageSize),
        enabled,
        refetchInterval: 5000,
        refetchOnWindowFocus: true,
    })
}

export function useBooking(id: number) {
    return useQuery({
        queryKey: bookingKeys.detail(id),
        queryFn: () => bookingApi.getById(id),
        enabled: id > 0,
    })
}

export function useBookingByCode(code: string, orderCode?: string) {
    return useQuery({
        queryKey: [...bookingKeys.code(code), orderCode] as const,
        queryFn: () => bookingApi.getByCode(code, orderCode),
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
    return useQuery<PaymentStatusResponse>({
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
