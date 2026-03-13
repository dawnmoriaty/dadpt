import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { getApiErrorMessage } from '@/services/api/client'
import { userApi } from '../api'
import type { CreateUserRequest, UpdateUserRequest } from '../types'

export const userKeys = {
    all: ['users'] as const,
    list: (page: number, pageSize: number) =>
        [...userKeys.all, 'list', page, pageSize] as const,
    detail: (id: number) => [...userKeys.all, 'detail', id] as const,
}

export function useUsers(page = 1, pageSize = 20) {
    return useQuery({
        queryKey: userKeys.list(page, pageSize),
        queryFn: () => userApi.list(page, pageSize),
    })
}

export function useUser(id: number) {
    return useQuery({
        queryKey: userKeys.detail(id),
        queryFn: () => userApi.getById(id),
        enabled: id > 0,
    })
}

export function useCreateUser() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation<unknown, Error, CreateUserRequest>({
        mutationFn: (data) => userApi.create(data),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: userKeys.all })
            toast.success(t('toast.createSuccess', { entity: t('entity.user') }))
        },
        onError: (error: Error) => {
            toast.error(getApiErrorMessage(error, t('toast.createError', { entity: t('entity.user') })))
        },
    })
}

export function useUpdateUser() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation<unknown, Error, { id: number; data: UpdateUserRequest }>({
        mutationFn: ({ id, data }) => userApi.update(id, data),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: userKeys.all })
            toast.success(t('toast.updateSuccess', { entity: t('entity.user') }))
        },
        onError: (error: Error) => {
            toast.error(getApiErrorMessage(error, t('toast.updateError', { entity: t('entity.user') })))
        },
    })
}

export function useDeleteUser() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation<void, Error, number>({
        mutationFn: (id) => userApi.delete(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: userKeys.all })
            toast.success(t('toast.deleteSuccess', { entity: t('entity.user') }))
        },
        onError: (error: Error) => {
            toast.error(getApiErrorMessage(error, t('toast.deleteError', { entity: t('entity.user') })))
        },
    })
}
