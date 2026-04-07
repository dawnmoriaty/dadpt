import type { PaginatedResponse, PagingParams } from '@/modules/shared'
import { api } from '@/services/api/client'

import type { Location, CreateLocationRequest, UpdateLocationRequest } from '../types'
import { normalizeLocationItem } from '../utils/normalize-location'

const BASE_URL = '/admin/locations'

export const locationApi = {
    list: async (params?: PagingParams): Promise<PaginatedResponse<Location>> => {
        const response = await api.get(BASE_URL, { params })
        const payload = response.data.data as PaginatedResponse<Location>
        return {
            ...payload,
            items: payload.items.map(normalizeLocationItem),
        }
    },

    getById: async (id: number): Promise<Location> => {
        const response = await api.get(`${BASE_URL}/${id}`)
        return normalizeLocationItem(response.data.data)
    },

    create: async (data: CreateLocationRequest): Promise<Location> => {
        const response = await api.post(BASE_URL, data)
        return normalizeLocationItem(response.data.data)
    },

    update: async (id: number, data: UpdateLocationRequest): Promise<Location> => {
        const response = await api.put(`${BASE_URL}/${id}`, data)
        return normalizeLocationItem(response.data.data)
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`${BASE_URL}/${id}`)
    },

    search: async (query: string): Promise<Location[]> => {
        const response = await api.get('/locations/search', { params: { q: query } })
        return (response.data.data as Location[]).map(normalizeLocationItem)
    },
}
