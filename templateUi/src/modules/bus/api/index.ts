import { api } from '@/services/api/client'

import type { Bus, CreateBusRequest, UpdateBusRequest } from '../types'

interface PagedResponse<T> {
    total: number
    page: number
    items: T[]
}

export const busApi = {
    list: async (page = 1, pageSize = 20, providerId?: number): Promise<PagedResponse<Bus>> => {
        const { data } = await api.get<{ data: PagedResponse<Bus> }>('/admin/buses', {
            params: { page, pageSize, providerId }
        })
        return data.data
    },

    getById: async (id: number): Promise<Bus> => {
        const { data } = await api.get<{ data: Bus }>(`/admin/buses/${id}`)
        return data.data
    },

    create: async (request: CreateBusRequest): Promise<Bus> => {
        const { data } = await api.post<{ data: Bus }>('/admin/buses', request)
        return data.data
    },

    update: async (id: number, request: UpdateBusRequest): Promise<Bus> => {
        const { data } = await api.put<{ data: Bus }>(`/admin/buses/${id}`, request)
        return data.data
    },

    updateStatus: async (id: number, status: string): Promise<Bus> => {
        const { data } = await api.patch<{ data: Bus }>(`/admin/buses/${id}/status`, { status })
        return data.data
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/admin/buses/${id}`)
    },
}
