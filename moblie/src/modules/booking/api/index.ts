import { api } from '@/src/services/api/client'
import type { PaginatedResponse } from '@/src/modules/shared/types'

export interface CreateBookingRequest {
    tripId: number
    seatCodes: string[]
    guestInfo: { name: string; phone: string; email?: string }
    pickupInfo: { name: string; surcharge: number }
    dropoffInfo: { name: string; surcharge: number }
    paymentMethod: string
}

export interface Booking {
    id: number;
    code: string;
    tripId: number;
    totalAmount: number;
    status: 'pending' | 'success' | 'failed' | 'cancelled';
    paymentMethod: string;
    expiresAt: string;
}

export interface CreateBookingResponse {
    booking: Booking;
    orderCode: string;
    paymentUrl?: string; // Checkout URL for PayOS
    qrCode?: string;     // Base64 QR code string
}

export const bookingApi = {
    create: async (data: CreateBookingRequest): Promise<CreateBookingResponse> => {
        const response = await api.post('/public/bookings', data)
        return response.data.data
    },
    getPaymentStatus: async (orderCode: string): Promise<{ status: string }> => {
        const response = await api.get(`/public/payments/${orderCode}/status`)
        return response.data.data
    },
    getMyBookings: async (): Promise<PaginatedResponse<Booking>> => {
        const response = await api.get('/public/bookings/my')
        return response.data.data
    }
}
