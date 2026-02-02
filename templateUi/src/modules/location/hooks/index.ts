import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import type { PagingParams } from '@/modules/shared'

import { locationApi } from '../api'
import type { CreateLocationRequest, UpdateLocationRequest } from '../types'

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

    return useMutation({
        mutationFn: (data: CreateLocationRequest) => locationApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY })
        },
    })
}

export function useUpdateLocation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateLocationRequest }) =>
            locationApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY })
        },
    })
}

export function useDeleteLocation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: number) => locationApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY })
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
