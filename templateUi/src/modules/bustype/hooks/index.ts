import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { getApiErrorMessage } from '@/services/api/client'

import { busTypeApi } from '../api'
import type { CreateBusTypeRequest, UpdateBusTypeRequest } from '../types'

export const busTypeKeys = {
    all: ['busTypes'] as const,
    list: (page: number, pageSize: number) => [...busTypeKeys.all, 'list', page, pageSize] as const,
    detail: (id: number) => [...busTypeKeys.all, 'detail', id] as const,
}

export function useBusTypes(page = 1, pageSize = 10) {
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
    const { t } = useTranslation()
    return useMutation<unknown, Error, CreateBusTypeRequest>({
        mutationFn: (data) => busTypeApi.create(data),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: busTypeKeys.all })
            toast.success(t('toast.createSuccess', { entity: t('entity.busType') }))
        },
        onError: (error: Error) => {
            toast.error(getApiErrorMessage(error, t('toast.createError', { entity: t('entity.busType') })))
        },
    })
}

export function useUpdateBusType() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation<unknown, Error, { id: number; data: UpdateBusTypeRequest }>({
        mutationFn: ({ id, data }) => busTypeApi.update(id, data),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: busTypeKeys.all })
            toast.success(t('toast.updateSuccess', { entity: t('entity.busType') }))
        },
        onError: (error: Error) => {
            toast.error(getApiErrorMessage(error, t('toast.updateError', { entity: t('entity.busType') })))
        },
    })
}

export function useDeleteBusType() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation<void, Error, number>({
        mutationFn: (id) => busTypeApi.delete(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: busTypeKeys.all })
            toast.success(t('toast.deleteSuccess', { entity: t('entity.busType') }))
        },
        onError: (error: Error) => {
            toast.error(getApiErrorMessage(error, t('toast.deleteError', { entity: t('entity.busType') })))
        },
    })
}

export function usePublicBusTypes() {
    return useQuery({
        queryKey: [...busTypeKeys.all, 'public'] as const,
        queryFn: () => busTypeApi.listPublic(),
    })
}
