import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { tripApi } from '../api'
import type { CreateTripRequest, UpdateTripRequest, TripListParams, TripStatus, Trip } from '../types'

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

    return useMutation<Trip, Error, CreateTripRequest>({
        mutationFn: (data) => tripApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TRIPS_QUERY_KEY })
            toast.success('Trip created successfully')
        },
        onError: (error) => {
            console.error('Create trip failed:', error)
            toast.error('Failed to create trip')
        },
    })
}

export function useUpdateTrip() {
    const queryClient = useQueryClient()

    return useMutation<Trip, Error, { id: number; data: UpdateTripRequest }>({
        mutationFn: ({ id, data }) => tripApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TRIPS_QUERY_KEY })
            toast.success('Trip updated successfully')
        },
        onError: (error) => {
            console.error('Update trip failed:', error)
            toast.error('Failed to update trip')
        },
    })
}

export function useUpdateTripStatus() {
    const queryClient = useQueryClient()

    return useMutation<Trip, Error, { id: number; status: TripStatus }>({
        mutationFn: ({ id, status }) => tripApi.updateStatus(id, status),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: TRIPS_QUERY_KEY })
            toast.success(`Trip status updated to ${variables.status}`)
        },
        onError: (error) => {
            console.error('Update trip status failed:', error)
            toast.error('Failed to update trip status')
        },
    })
}

export function useDeleteTrip() {
    const queryClient = useQueryClient()

    return useMutation<void, Error, number>({
        mutationFn: (id) => tripApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TRIPS_QUERY_KEY })
            toast.success('Trip deleted successfully')
        },
        onError: (error) => {
            console.error('Delete trip failed:', error)
            toast.error('Failed to delete trip')
        },
    })
}
