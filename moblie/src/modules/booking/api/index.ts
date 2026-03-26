import { api } from '@/src/services/api/client'
import type { PaginatedResponse } from '@/src/modules/shared/types'
import type {
    Booking,
    BookingListParams,
    CreateBookingRequest,
    CreateBookingResponse,
    PaymentStatusResponse,
} from '../types'

export const bookingApi = {
    create: async (data: CreateBookingRequest): Promise<CreateBookingResponse> => {
        const response = await api.post('/bookings', data)
        return response.data.data
    },
    getPaymentStatus: async (orderCode: string): Promise<PaymentStatusResponse> => {
        const response = await api.get(`/bookings/payments/${orderCode}/status`)
        return response.data.data
    },

    getByCode: async (code: string, orderCode?: string): Promise<CreateBookingResponse> => {
        const response = await api.get(`/bookings/code/${code}`, {
            params: orderCode ? { orderCode } : undefined,
        })
        return response.data.data
    },

    getMyBookings: async (params?: BookingListParams): Promise<PaginatedResponse<Booking>> => {
        const response = await api.get('/bookings/my', { params })
        return response.data.data
    },

    cancel: async (id: number): Promise<Booking> => {
        const response = await api.post(`/bookings/${id}/cancel`)
        return response.data.data
    },
}
