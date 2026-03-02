import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { PagingParams } from '@/modules/shared'
import { getApiErrorMessage } from '@/services/api/client'

import { providerApi } from '../api'
import type { CreateProviderRequest, UpdateProviderRequest } from '../types'

export const providerKeys = {
    all: ['providers'] as const,
    list: (params?: PagingParams) => [...providerKeys.all, 'list', params] as const,
    detail: (id: number) => [...providerKeys.all, 'detail', id] as const,
    active: () => [...providerKeys.all, 'active'] as const,
}

// Keep legacy export for backward compatibility
export const PROVIDERS_QUERY_KEY = providerKeys.all

export function useProviders(params?: PagingParams) {
    return useQuery({
        queryKey: providerKeys.list(params),
        queryFn: () => providerApi.list(params),
    })
}

export function useProvider(id: number) {
    return useQuery({
        queryKey: providerKeys.detail(id),
        queryFn: () => providerApi.getById(id),
        enabled: !!id,
    })
}

export function useCreateProvider() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()

    return useMutation({
        mutationFn: (data: CreateProviderRequest) => providerApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: providerKeys.all })
            toast.success(t('toast.createSuccess', { entity: t('entity.provider') }))
        },
        onError: (error: Error) => {
            toast.error(getApiErrorMessage(error, t('toast.createError', { entity: t('entity.provider') })))
        },
    })
}

export function useUpdateProvider() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateProviderRequest }) =>
            providerApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: providerKeys.all })
            toast.success(t('toast.updateSuccess', { entity: t('entity.provider') }))
        },
        onError: (error: Error) => {
            toast.error(getApiErrorMessage(error, t('toast.updateError', { entity: t('entity.provider') })))
        },
    })
}

export function useToggleProviderActive() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()

    return useMutation({
        mutationFn: (id: number) => providerApi.toggleActive(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: providerKeys.all })
            toast.success(t('toast.updateSuccess', { entity: t('entity.provider') }))
        },
        onError: (error: Error) => {
            toast.error(getApiErrorMessage(error, t('toast.updateError', { entity: t('entity.provider') })))
        },
    })
}

export function useDeleteProvider() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()

    return useMutation({
        mutationFn: (id: number) => providerApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: providerKeys.all })
            toast.success(t('toast.deleteSuccess', { entity: t('entity.provider') }))
        },
        onError: (error: Error) => {
            toast.error(getApiErrorMessage(error, t('toast.deleteError', { entity: t('entity.provider') })))
        },
    })
}

export function useActiveProviders() {
    return useQuery({
        queryKey: providerKeys.active(),
        queryFn: () => providerApi.listActive(),
    })
}
