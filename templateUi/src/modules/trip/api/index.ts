import type { PaginatedResponse } from '@/modules/shared'
import { api } from '@/services/api/client'

import type { Trip, CreateTripRequest, UpdateTripRequest, TripListParams, TripStatus } from '../types'

const BASE_URL = '/admin/trips'

export const tripApi = {
    list: async (params?: TripListParams): Promise<PaginatedResponse<Trip>> => {
        const response = await api.get(BASE_URL, { params })
        return response.data.data
    },

    getById: async (id: number): Promise<Trip> => {
        const response = await api.get(`/trips/${id}`)
        return response.data.data
    },

    create: async (data: CreateTripRequest): Promise<Trip> => {
        const response = await api.post(BASE_URL, data)
        return response.data.data
    },

    update: async (id: number, data: UpdateTripRequest): Promise<Trip> => {
        const response = await api.put(`${BASE_URL}/${id}`, data)
        return response.data.data
    },

    updateStatus: async (id: number, status: TripStatus): Promise<Trip> => {
        const response = await api.patch(`${BASE_URL}/${id}/status`, { status })
        return response.data.data
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`${BASE_URL}/${id}`)
    },

    search: async (params: {
        originId: number
        destinationId: number
        departureDate: string
        minSeats?: number
    }): Promise<PaginatedResponse<Trip>> => {
        const response = await api.get('/trips', { params })
        return response.data.data
    },
}
