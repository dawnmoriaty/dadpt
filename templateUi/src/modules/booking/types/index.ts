// Booking module types

export type BookingStatus = 'pending' | 'paid' | 'cancelled' | 'expired' | 'refund_pending' | 'refunded'
export type PaymentMethod = 'bank_transfer' | 'cod' | 'visa'

export interface GuestInfo {
    name: string
    phone: string
    email?: string
}

export interface PointInfo {
    name: string
    time?: string
    surcharge?: number
}

export interface Booking {
    id: number
    code: string
    tripId: number
    userId?: number
    guestInfo: GuestInfo
    pickupInfo: PointInfo
    dropoffInfo: PointInfo
    seatCodes: string[]
    totalAmount: number
    status: BookingStatus
    paymentMethod: string
    expiresAt: string
    refundedAt?: string
    refundReference?: string
    refundNote?: string
    createdAt: string
    updatedAt: string

    // Joined fields
    departureTime?: string
    arrivalTime?: string
    originName?: string
    destinationName?: string
}

export interface CreateBookingRequest {
    tripId: number
    seatCodes: string[]
    guestInfo: GuestInfo
    pickupInfo: PointInfo
    dropoffInfo: PointInfo
    paymentMethod: string
}

export interface CreateBookingResponse {
    booking: Booking
    orderCode: string
    paymentUrl?: string
    qrCode?: string
    resumeUrl?: string
}

export interface PaymentStatusResponse {
    orderCode: string
    status: string
}

export interface BookingListParams {
    page?: number
    pageSize?: number
}

// Admin refund types
export interface RefundRequestListParams {
    page?: number
    pageSize?: number
}

export interface RefundActionRequest {
    reason?: string
    refundReference?: string
    refundNote?: string
}

export interface RefundRequestListResponse {
    items: Booking[]
    total: number
    page: number
    pageSize: number
}
