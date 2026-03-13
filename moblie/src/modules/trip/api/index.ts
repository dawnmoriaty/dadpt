import { api } from '@/src/services/api/client'
import type { PaginatedResponse } from '@/src/modules/shared/types'
import type { Trip, SearchTripsRequest } from '../types'

export const tripApi = {
    search: async (params: SearchTripsRequest): Promise<PaginatedResponse<Trip>> => {
        const response = await api.get('/public/trips/search', { params })
        return response.data.data
    },

    getById: async (id: number): Promise<Trip> => {
        const response = await api.get(`/public/trips/${id}`)
        return response.data.data
    },
}
