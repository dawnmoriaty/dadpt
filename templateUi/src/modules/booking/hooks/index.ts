import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { getApiErrorMessage } from '@/services/api/client'

import { bookingApi } from '../api'
import type { CreateBookingRequest, CreateBookingResponse } from '../types'

export const bookingKeys = {
    all: ['bookings'] as const,
    mine: (page: number, pageSize: number) => [...bookingKeys.all, 'mine', page, pageSize] as const,
    detail: (id: number) => [...bookingKeys.all, 'detail', id] as const,
    code: (code: string) => [...bookingKeys.all, 'code', code] as const,
    searchTrips: (params: Record<string, unknown>) => [...bookingKeys.all, 'trip-search', params] as const,
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

    return useMutation({
        mutationFn: (id: number) => bookingApi.cancel(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bookingKeys.all })
            toast.success(t('toast.deleteSuccess', { entity: t('entity.booking') }))
        },
        onError: (error: Error) => {
            toast.error(getApiErrorMessage(error, t('toast.deleteError', { entity: t('entity.booking') })))
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
