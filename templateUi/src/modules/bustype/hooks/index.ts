import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { busTypeApi } from '../api'
import type { CreateBusTypeRequest, UpdateBusTypeRequest } from '../types'

export const busTypeKeys = {
    all: ['busTypes'] as const,
    list: (page: number, pageSize: number) => [...busTypeKeys.all, 'list', page, pageSize] as const,
    detail: (id: number) => [...busTypeKeys.all, 'detail', id] as const,
}

export function useBusTypes(page = 1, pageSize = 20) {
    return useQuery({
        queryKey: busTypeKeys.list(page, pageSize),
        queryFn: () => busTypeApi.list(page, pageSize),
    })
}

export function useBusType(id: number) {
    return useQuery({
        queryKey: busTypeKeys.detail(id),
        queryFn: () => busTypeApi.getById(id),
        enabled: id > 0,
    })
}

export function useCreateBusType() {
    const queryClient = useQueryClient()
    return useMutation<unknown, Error, CreateBusTypeRequest>({
        mutationFn: (data) => busTypeApi.create(data),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: busTypeKeys.all })
        },
    })
}

export function useUpdateBusType() {
    const queryClient = useQueryClient()
    return useMutation<unknown, Error, { id: number; data: UpdateBusTypeRequest }>({
        mutationFn: ({ id, data }) => busTypeApi.update(id, data),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: busTypeKeys.all })
        },
    })
}

export function useDeleteBusType() {
    const queryClient = useQueryClient()
    return useMutation<void, Error, number>({
        mutationFn: (id) => busTypeApi.delete(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: busTypeKeys.all })
        },
    })
}
