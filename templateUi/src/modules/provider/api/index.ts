import type { PaginatedResponse, PagingParams } from '@/modules/shared'
import { api } from '@/services/api/client'

import type { Provider, CreateProviderRequest, UpdateProviderRequest } from '../types'

const BASE_URL = '/admin/providers'

export const providerApi = {
    list: async (params?: PagingParams): Promise<PaginatedResponse<Provider>> => {
        const response = await api.get(BASE_URL, { params })
        return response.data.data
    },

    getById: async (id: number): Promise<Provider> => {
        const response = await api.get(`${BASE_URL}/${id}`)
        return response.data.data
    },

    create: async (data: CreateProviderRequest): Promise<Provider> => {
        const response = await api.post(BASE_URL, data)
        return response.data.data
    },

    update: async (id: number, data: UpdateProviderRequest): Promise<Provider> => {
        const response = await api.put(`${BASE_URL}/${id}`, data)
        return response.data.data
    },

    toggleActive: async (id: number): Promise<Provider> => {
        const response = await api.patch(`${BASE_URL}/${id}/toggle`)
        return response.data.data
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`${BASE_URL}/${id}`)
    },

    listActive: async (): Promise<Provider[]> => {
        const response = await api.get('/providers')
        return response.data.data
    },
}
