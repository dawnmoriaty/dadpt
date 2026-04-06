import { api } from '@/services/api/client'

import type { User, CreateUserRequest, UpdateUserRequest } from '../types'

interface PagedResponse<T> {
    total: number
    page: number
    items: T[]
}

export const userApi = {
    list: async (page = 1, pageSize = 10): Promise<PagedResponse<User>> => {
        const { data } = await api.get<{ data: PagedResponse<User> }>('/admin/users', {
            params: { page, pageSize }
        })
        return data.data
    },

    getById: async (id: number): Promise<User> => {
        const { data } = await api.get<{ data: User }>(`/admin/users/${id}`)
        return data.data
    },

    create: async (request: CreateUserRequest): Promise<User> => {
        const { data } = await api.post<{ data: User }>('/admin/users', request)
        return data.data
    },

    update: async (id: number, request: UpdateUserRequest): Promise<User> => {
        const { data } = await api.put<{ data: User }>(`/admin/users/${id}`, request)
        return data.data
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/admin/users/${id}`)
    },
}
