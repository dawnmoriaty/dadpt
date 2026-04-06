import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { getApiErrorMessage } from '@/services/api/client'

import { busApi } from '../api'
import type { CreateBusRequest, UpdateBusRequest } from '../types'

export const busKeys = {
    all: ['buses'] as const,
    list: (page: number, pageSize: number, providerId?: number) => 
        [...busKeys.all, 'list', page, pageSize, providerId] as const,
    detail: (id: number) => [...busKeys.all, 'detail', id] as const,
}

export function useBuses(page = 1, pageSize = 10, providerId?: number) {
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
    const { t } = useTranslation()
    return useMutation<unknown, Error, CreateBusRequest>({
        mutationFn: (data) => busApi.create(data),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: busKeys.all })
            toast.success(t('toast.createSuccess', { entity: t('entity.bus') }))
        },
        onError: (error: Error) => {
            toast.error(getApiErrorMessage(error, t('toast.createError', { entity: t('entity.bus') })))
        },
    })
}

export function useUpdateBus() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation<unknown, Error, { id: number; data: UpdateBusRequest }>({
        mutationFn: ({ id, data }) => busApi.update(id, data),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: busKeys.all })
            toast.success(t('toast.updateSuccess', { entity: t('entity.bus') }))
        },
        onError: (error: Error) => {
            toast.error(getApiErrorMessage(error, t('toast.updateError', { entity: t('entity.bus') })))
        },
    })
}

export function useUpdateBusStatus() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation<unknown, Error, { id: number; status: string }>({
        mutationFn: ({ id, status }) => busApi.updateStatus(id, status),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: busKeys.all })
            toast.success(t('toast.updateSuccess', { entity: t('entity.bus') }))
        },
        onError: (error: Error) => {
            toast.error(getApiErrorMessage(error, t('toast.updateError', { entity: t('entity.bus') })))
        },
    })
}

export function useDeleteBus() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation<void, Error, number>({
        mutationFn: (id) => busApi.delete(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: busKeys.all })
            toast.success(t('toast.deleteSuccess', { entity: t('entity.bus') }))
        },
        onError: (error: Error) => {
            toast.error(getApiErrorMessage(error, t('toast.deleteError', { entity: t('entity.bus') })))
        },
    })
}
