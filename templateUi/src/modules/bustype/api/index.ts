import { api } from '@/services/api/client'

import type { BusType, CreateBusTypeRequest, UpdateBusTypeRequest } from '../types'

interface PagedResponse<T> {
    total: number
    page: number
    items: T[]
}

export const busTypeApi = {
    list: async (page = 1, pageSize = 20): Promise<PagedResponse<BusType>> => {
        const { data } = await api.get<{ data: PagedResponse<BusType> }>('/admin/bus-types', {
            params: { page, pageSize }
        })
        return data.data
    },

    getById: async (id: number): Promise<BusType> => {
        const { data } = await api.get<{ data: BusType }>(`/admin/bus-types/${id}`)
        return data.data
    },

    create: async (request: CreateBusTypeRequest): Promise<BusType> => {
        const { data } = await api.post<{ data: BusType }>('/admin/bus-types', request)
        return data.data
    },

    update: async (id: number, request: UpdateBusTypeRequest): Promise<BusType> => {
        const { data } = await api.put<{ data: BusType }>(`/admin/bus-types/${id}`, request)
        return data.data
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/admin/bus-types/${id}`)
    },
}
