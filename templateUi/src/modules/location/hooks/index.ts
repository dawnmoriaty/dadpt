import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { PagingParams } from '@/modules/shared'
import { getApiErrorMessage } from '@/services/api/client'

import { locationApi } from '../api'
import type { CreateLocationRequest, UpdateLocationRequest, Location } from '../types'

export const locationKeys = {
    all: ['locations'] as const,
    list: (params?: PagingParams) => [...locationKeys.all, 'list', params] as const,
    detail: (id: number) => [...locationKeys.all, 'detail', id] as const,
    search: (query: string) => [...locationKeys.all, 'search', query] as const,
}

// Keep legacy export for backward compatibility
export const LOCATIONS_QUERY_KEY = locationKeys.all

export function useLocations(params?: PagingParams) {
    return useQuery({
        queryKey: locationKeys.list(params),
        queryFn: () => locationApi.list(params),
    })
}

export function useLocation(id: number) {
    return useQuery({
        queryKey: locationKeys.detail(id),
        queryFn: () => locationApi.getById(id),
        enabled: !!id,
    })
}

export function useCreateLocation() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()

    return useMutation<Location, Error, CreateLocationRequest>({
        mutationFn: (data) => locationApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY })
            toast.success(t('toast.createSuccess', { entity: t('entity.location') }))
        },
        onError: (error) => {
            console.error('Create location failed:', error)
            toast.error(getApiErrorMessage(error, t('toast.createError', { entity: t('entity.location') })))
        },
    })
}

export function useUpdateLocation() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()

    return useMutation<Location, Error, { id: number; data: UpdateLocationRequest }>({
        mutationFn: ({ id, data }) => locationApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY })
            toast.success(t('toast.updateSuccess', { entity: t('entity.location') }))
        },
        onError: (error) => {
            console.error('Update location failed:', error)
            toast.error(getApiErrorMessage(error, t('toast.updateError', { entity: t('entity.location') })))
        },
    })
}

export function useDeleteLocation() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()

    return useMutation<void, Error, number>({
        mutationFn: (id) => locationApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY })
            toast.success(t('toast.deleteSuccess', { entity: t('entity.location') }))
        },
        onError: (error) => {
            console.error('Delete location failed:', error)
            toast.error(getApiErrorMessage(error, t('toast.deleteError', { entity: t('entity.location') })))
        },
    })
}

export function useSearchLocations(query: string) {
    return useQuery({
        queryKey: locationKeys.search(query),
        queryFn: () => locationApi.search(query),
        enabled: query.trim().length > 0,
    })
}
