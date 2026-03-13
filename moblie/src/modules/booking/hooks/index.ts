import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { bookingApi, CreateBookingRequest, CreateBookingResponse, Booking } from '../api'
import type { PaginatedResponse } from '@/src/modules/shared/types'
// In React Native we don't have toast out of the box so we'll leave it or mock it
// If we want toast we can install toast package later

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
    return useQuery({
        queryKey: ['payment-status', orderCode],
        queryFn: () => bookingApi.getPaymentStatus(orderCode),
        enabled: !!orderCode && isPending,
        refetchInterval: isPending ? 3000 : false, // Poll every 3 seconds if pending
    })
}

export function useMyBookings() {
    return useQuery<PaginatedResponse<Booking>>({
        queryKey: BOOKINGS_QUERY_KEY,
        queryFn: () => bookingApi.getMyBookings(),
    })
}
