import type { PaginatedResponse } from '@/modules/shared'
import type { Trip } from '@/modules/trip'
import { api } from '@/services/api/client'

import type { Booking, CreateBookingRequest, CreateBookingResponse, PaymentStatusResponse, RefundActionRequest, RefundRequestListResponse } from '../types'

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

    browseTrips: async (params?: {
        providerIds?: number[]
        busTypeIds?: number[]
        page?: number
        limit?: number
    }): Promise<PaginatedResponse<Trip>> => {
        const query: Record<string, unknown> = {
            page: params?.page ?? 1,
            limit: params?.limit ?? 20,
        }
        if (params?.providerIds?.length) query.providerId = params.providerIds[0]
        if (params?.busTypeIds?.length) query.busTypeId = params.busTypeIds[0]
        const response = await api.get('/trips/browse', { params: query })
        return response.data.data
    },

    getPaymentStatus: async (orderCode: string): Promise<PaymentStatusResponse> => {
        const response = await api.get(`/bookings/payments/${orderCode}/status`)
        return response.data.data
    },
}

// Admin refund API
export const adminBookingApi = {
    listRefundRequests: async (page = 1, pageSize = 20): Promise<RefundRequestListResponse> => {
        const response = await api.get('/admin/bookings/refund-requests', {
            params: { page, pageSize },
        })
        return response.data.data
    },

    countRefundPending: async (): Promise<{ count: number }> => {
        const response = await api.get('/admin/bookings/refund-pending-count')
        return response.data.data
    },

    approveRefund: async (id: number, data?: RefundActionRequest): Promise<Booking> => {
        const response = await api.post(`/admin/bookings/${id}/approve-refund`, data ?? {})
        return response.data.data
    },

    rejectRefund: async (id: number, data?: RefundActionRequest): Promise<Booking> => {
        const response = await api.post(`/admin/bookings/${id}/reject-refund`, data ?? {})
        return response.data.data
    },
}
