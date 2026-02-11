import type { PaginatedResponse } from '@/modules/shared'
import type { Trip } from '@/modules/trip'
import { api } from '@/services/api/client'

import type { Booking, CreateBookingRequest, CreateBookingResponse } from '../types'

export const bookingApi = {
    create: async (data: CreateBookingRequest): Promise<CreateBookingResponse> => {
        const response = await api.post('/bookings', data)
        return response.data.data
    },

    getById: async (id: number): Promise<Booking> => {
        const response = await api.get(`/bookings/${id}`)
        return response.data.data
    },

    getByCode: async (code: string): Promise<Booking> => {
        const response = await api.get(`/bookings/code/${code}`)
        return response.data.data
    },

    listMine: async (page = 1, pageSize = 20): Promise<PaginatedResponse<Booking>> => {
        const response = await api.get('/bookings/my', {
            params: { page, pageSize },
        })
        return response.data.data
    },

    cancel: async (id: number): Promise<Booking> => {
        const response = await api.post(`/bookings/${id}/cancel`)
        return response.data.data
    },

    // Public trip search (no auth required)
    searchTrips: async (params: {
        originId: number
        destinationId: number
        departureDate: string
        minSeats?: number
    }): Promise<PaginatedResponse<Trip>> => {
        const response = await api.get('/trips', { params })
        return response.data.data
    },
}
