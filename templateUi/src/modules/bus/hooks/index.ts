import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { busApi } from '../api'
import type { CreateBusRequest, UpdateBusRequest } from '../types'

export const busKeys = {
    all: ['buses'] as const,
    list: (page: number, pageSize: number, providerId?: number) => 
        [...busKeys.all, 'list', page, pageSize, providerId] as const,
    detail: (id: number) => [...busKeys.all, 'detail', id] as const,
}

export function useBuses(page = 1, pageSize = 20, providerId?: number) {
    return useQuery({
        queryKey: busKeys.list(page, pageSize, providerId),
        queryFn: () => busApi.list(page, pageSize, providerId),
    })
}

export function useBus(id: number) {
    return useQuery({
        queryKey: busKeys.detail(id),
        queryFn: () => busApi.getById(id),
        enabled: id > 0,
    })
}

export function useCreateBus() {
    const queryClient = useQueryClient()
    return useMutation<unknown, Error, CreateBusRequest>({
        mutationFn: (data) => busApi.create(data),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: busKeys.all })
        },
    })
}

export function useUpdateBus() {
    const queryClient = useQueryClient()
    return useMutation<unknown, Error, { id: number; data: UpdateBusRequest }>({
        mutationFn: ({ id, data }) => busApi.update(id, data),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: busKeys.all })
        },
    })
}

export function useUpdateBusStatus() {
    const queryClient = useQueryClient()
    return useMutation<unknown, Error, { id: number; status: string }>({
        mutationFn: ({ id, status }) => busApi.updateStatus(id, status),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: busKeys.all })
        },
    })
}

export function useDeleteBus() {
    const queryClient = useQueryClient()
    return useMutation<void, Error, number>({
        mutationFn: (id) => busApi.delete(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: busKeys.all })
        },
    })
}
