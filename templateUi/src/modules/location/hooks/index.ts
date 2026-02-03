import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { PagingParams } from '@/modules/shared'

import { locationApi } from '../api'
import type { CreateLocationRequest, UpdateLocationRequest, Location } from '../types'

export const LOCATIONS_QUERY_KEY = ['admin-locations']

export function useLocations(params?: PagingParams) {
    return useQuery({
        queryKey: [...LOCATIONS_QUERY_KEY, params],
        queryFn: () => locationApi.list(params),
    })
}

export function useLocation(id: number) {
    return useQuery({
        queryKey: [...LOCATIONS_QUERY_KEY, id],
        queryFn: () => locationApi.getById(id),
        enabled: !!id,
    })
}

export function useCreateLocation() {
    const queryClient = useQueryClient()

    return useMutation<Location, Error, CreateLocationRequest>({
        mutationFn: (data) => locationApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY })
            toast.success('Location created successfully')
        },
        onError: (error) => {
            console.error('Create location failed:', error)
            toast.error('Failed to create location')
        },
    })
}

export function useUpdateLocation() {
    const queryClient = useQueryClient()

    return useMutation<Location, Error, { id: number; data: UpdateLocationRequest }>({
        mutationFn: ({ id, data }) => locationApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY })
            toast.success('Location updated successfully')
        },
        onError: (error) => {
            console.error('Update location failed:', error)
            toast.error('Failed to update location')
        },
    })
}

export function useDeleteLocation() {
    const queryClient = useQueryClient()

    return useMutation<void, Error, number>({
        mutationFn: (id) => locationApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY })
            toast.success('Location deleted successfully')
        },
        onError: (error) => {
            console.error('Delete location failed:', error)
            toast.error('Failed to delete location')
        },
    })
}

export function useSearchLocations(query: string) {
    return useQuery({
        queryKey: ['locations-search', query],
        queryFn: () => locationApi.search(query),
        enabled: query.length > 0,
    })
}
