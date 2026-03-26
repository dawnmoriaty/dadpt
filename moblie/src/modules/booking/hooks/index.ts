import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { bookingApi } from '../api'
import type { PaginatedResponse } from '@/src/modules/shared/types'
import type { Booking, BookingListParams, CreateBookingRequest, CreateBookingResponse, PaymentStatusResponse } from '../types'

export const BOOKINGS_QUERY_KEY = ['my-bookings']

export function useCreateBooking() {
    const queryClient = useQueryClient()
    return useMutation<CreateBookingResponse, Error, CreateBookingRequest>({
        mutationFn: (data) => bookingApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY })
        },
    })
}

export function usePaymentStatus(orderCode: string, isPending: boolean) {
    return useQuery<PaymentStatusResponse>({
        queryKey: ['payment-status', orderCode],
        queryFn: () => bookingApi.getPaymentStatus(orderCode),
        enabled: !!orderCode && isPending,
        refetchInterval: (query) => {
            const status = query.state.data?.status
            if (status === 'success' || status === 'failed' || status === 'paid' || status === 'cancelled') {
                return false
            }
            return isPending ? 3000 : false
        },
    })
}

export function useMyBookings(params?: BookingListParams) {
    return useQuery<PaginatedResponse<Booking>>({
        queryKey: [...BOOKINGS_QUERY_KEY, params],
        queryFn: () => bookingApi.getMyBookings(params),
    })
}

export function useBookingByCode(code: string, orderCode?: string) {
    return useQuery<CreateBookingResponse>({
        queryKey: [...BOOKINGS_QUERY_KEY, 'code', code, orderCode],
        queryFn: () => bookingApi.getByCode(code, orderCode),
        enabled: code.trim().length > 0,
    })
}

export function useCancelBooking() {
    const queryClient = useQueryClient()

    return useMutation<Booking, Error, number>({
        mutationFn: (id) => bookingApi.cancel(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY })
        },
    })
}
