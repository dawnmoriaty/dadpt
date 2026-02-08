import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { getApiErrorMessage } from '@/services/api/client'

import { tripApi } from '../api'
import type { CreateTripRequest, UpdateTripRequest, TripListParams, TripStatus, Trip } from '../types'

export const tripKeys = {
    all: ['trips'] as const,
    list: (params?: TripListParams) => [...tripKeys.all, 'list', params] as const,
    detail: (id: number) => [...tripKeys.all, 'detail', id] as const,
    search: (params: Record<string, unknown>) => [...tripKeys.all, 'search', params] as const,
}

// Keep legacy export for backward compatibility  
export const TRIPS_QUERY_KEY = tripKeys.all

export function useTrips(params?: TripListParams) {
    return useQuery({
        queryKey: tripKeys.list(params),
        queryFn: () => tripApi.list(params),
    })
}

export function useTrip(id: number) {
    return useQuery({
        queryKey: tripKeys.detail(id),
        queryFn: () => tripApi.getById(id),
        enabled: !!id,
    })
}

export function useCreateTrip() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()

    return useMutation<Trip, Error, CreateTripRequest>({
        mutationFn: (data) => tripApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tripKeys.all })
            toast.success(t('toast.createSuccess', { entity: t('entity.trip') }))
        },
        onError: (error: Error) => {
            toast.error(getApiErrorMessage(error, t('toast.createError', { entity: t('entity.trip') })))
        },
    })
}

export function useUpdateTrip() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()

    return useMutation<Trip, Error, { id: number; data: UpdateTripRequest }>({
        mutationFn: ({ id, data }) => tripApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tripKeys.all })
            toast.success(t('toast.updateSuccess', { entity: t('entity.trip') }))
        },
        onError: (error: Error) => {
            toast.error(getApiErrorMessage(error, t('toast.updateError', { entity: t('entity.trip') })))
        },
    })
}

export function useUpdateTripStatus() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()

    return useMutation<Trip, Error, { id: number; status: TripStatus }>({
        mutationFn: ({ id, status }) => tripApi.updateStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tripKeys.all })
            toast.success(t('toast.updateSuccess', { entity: t('entity.trip') }))
        },
        onError: (error: Error) => {
            toast.error(getApiErrorMessage(error, t('toast.updateError', { entity: t('entity.trip') })))
        },
    })
}

export function useDeleteTrip() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()

    return useMutation<void, Error, number>({
        mutationFn: (id) => tripApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tripKeys.all })
            toast.success(t('toast.deleteSuccess', { entity: t('entity.trip') }))
        },
        onError: (error: Error) => {
            toast.error(getApiErrorMessage(error, t('toast.deleteError', { entity: t('entity.trip') })))
        },
    })
}
