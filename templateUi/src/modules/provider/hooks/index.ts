import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import type { PagingParams } from '@/modules/shared'

import { providerApi } from '../api'
import type { CreateProviderRequest, UpdateProviderRequest } from '../types'

export const PROVIDERS_QUERY_KEY = ['admin-providers']

export function useProviders(params?: PagingParams) {
    return useQuery({
        queryKey: [...PROVIDERS_QUERY_KEY, params],
        queryFn: () => providerApi.list(params),
    })
}

export function useProvider(id: number) {
    return useQuery({
        queryKey: [...PROVIDERS_QUERY_KEY, id],
        queryFn: () => providerApi.getById(id),
        enabled: !!id,
    })
}

export function useCreateProvider() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: CreateProviderRequest) => providerApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PROVIDERS_QUERY_KEY })
        },
    })
}

export function useUpdateProvider() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateProviderRequest }) =>
            providerApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PROVIDERS_QUERY_KEY })
        },
    })
}

export function useToggleProviderActive() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: number) => providerApi.toggleActive(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PROVIDERS_QUERY_KEY })
        },
    })
}

export function useDeleteProvider() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: number) => providerApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PROVIDERS_QUERY_KEY })
        },
    })
}

export function useActiveProviders() {
    return useQuery({
        queryKey: ['providers-active'],
        queryFn: () => providerApi.listActive(),
    })
}
