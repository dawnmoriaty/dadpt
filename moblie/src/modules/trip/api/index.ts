import { api } from '@/src/services/api/client'
import type { PaginatedResponse } from '@/src/modules/shared/types'
import type { Trip, SearchTripsRequest } from '../types'

export const tripApi = {
    search: async (params: SearchTripsRequest): Promise<PaginatedResponse<Trip>> => {
        const response = await api.get('/trips', { params })
        return response.data.data
    },

    browse: async (params?: {
        providerIds?: number[]
        busTypeIds?: number[]
        page?: number
        limit?: number
    }): Promise<PaginatedResponse<Trip>> => {
        const query: Record<string, unknown> = {
            page: params?.page ?? 1,
            limit: params?.limit ?? 12,
        }
        if (params?.providerIds?.length) query.providerId = params.providerIds[0]
        if (params?.busTypeIds?.length) query.busTypeId = params.busTypeIds[0]

        const response = await api.get('/trips/browse', { params: query })
        return response.data.data
    },

    getById: async (id: number): Promise<Trip> => {
        const response = await api.get(`/trips/${id}`)
        return response.data.data
    },
}
