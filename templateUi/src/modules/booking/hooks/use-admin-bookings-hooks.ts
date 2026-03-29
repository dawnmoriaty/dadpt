import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { getApiErrorMessage } from '@/services/api/client'

import { adminBookingApi } from '../api'
import type { AdminBookingListParams, AdminUpdateBookingStatusRequest, Booking } from '../types'

import { adminBookingKeys } from './query-keys'

export function useAdminBookings(params: AdminBookingListParams) {
    return useQuery({
        queryKey: adminBookingKeys.list(params as Record<string, unknown>),
        queryFn: () => adminBookingApi.listBookings(params),
    })
}

export function useAdminBookingStats() {
    return useQuery({
        queryKey: adminBookingKeys.stats,
        queryFn: () => adminBookingApi.getStats(),
    })
}

export function useTripSeatManifest(tripId?: number) {
    return useQuery({
        queryKey: adminBookingKeys.tripSeats(tripId ?? 0),
        queryFn: () => adminBookingApi.getTripSeatManifest(tripId ?? 0),
        enabled: typeof tripId === 'number' && tripId > 0,
    })
}

export function useAdminBookingDetail(bookingId?: number) {
    return useQuery({
        queryKey: adminBookingKeys.detail(bookingId ?? 0),
        queryFn: () => adminBookingApi.getBookingDetail(bookingId ?? 0),
        enabled: typeof bookingId === 'number' && bookingId > 0,
    })
}

export function useAdminRevenueSeries(days = 7) {
    return useQuery({
        queryKey: adminBookingKeys.revenueSeries(days),
        queryFn: () => adminBookingApi.getRevenueSeries(days),
    })
}

export function useAdminUpdateBookingStatus() {
    const queryClient = useQueryClient()

    return useMutation<Booking, Error, { id: number; data: AdminUpdateBookingStatusRequest }>({
        mutationFn: ({ id, data }) => adminBookingApi.updateBookingStatus(id, data),
        onSuccess: (booking) => {
            queryClient.invalidateQueries({ queryKey: adminBookingKeys.root })
            queryClient.invalidateQueries({ queryKey: ['bookings'] })
            queryClient.setQueryData(adminBookingKeys.detail(booking.id), booking)
            toast.success('Đã cập nhật trạng thái booking.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Không thể cập nhật trạng thái booking.'))
        },
    })
}

export function useAdminExportBookingsCsv() {
    return useMutation<Blob, Error, AdminBookingListParams>({
        mutationFn: (params) => adminBookingApi.exportBookingsCsv(params),
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Không thể export danh sách booking.'))
        },
    })
}
