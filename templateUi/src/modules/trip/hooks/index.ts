import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { tripApi } from '../api'
import type { CreateTripRequest, UpdateTripRequest, TripListParams, TripStatus } from '../types'

export const TRIPS_QUERY_KEY = ['admin-trips']

export function useTrips(params?: TripListParams) {
    return useQuery({
        queryKey: [...TRIPS_QUERY_KEY, params],
        queryFn: () => tripApi.list(params),
    })
}

export function useTrip(id: number) {
    return useQuery({
        queryKey: ['trips', id],
        queryFn: () => tripApi.getById(id),
        enabled: !!id,
    })
}

export function useCreateTrip() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: CreateTripRequest) => tripApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TRIPS_QUERY_KEY })
        },
    })
}

export function useUpdateTrip() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateTripRequest }) =>
            tripApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TRIPS_QUERY_KEY })
        },
    })
}

export function useUpdateTripStatus() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, status }: { id: number; status: TripStatus }) =>
            tripApi.updateStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TRIPS_QUERY_KEY })
        },
    })
}

export function useDeleteTrip() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: number) => tripApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TRIPS_QUERY_KEY })
        },
    })
}
