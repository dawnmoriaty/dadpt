import type { PickupPoint, Trip } from '@/src/modules/trip'

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
    orderCode?: string
    tripId: number
    guestInfo: GuestInfo
    pickupInfo: PointInfo
    dropoffInfo: PointInfo
    seatCodes: string[]
    totalAmount: number
    status: BookingStatus
    paymentMethod: PaymentMethod
    expiresAt?: string
    createdAt?: string
    updatedAt?: string
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
    paymentMethod: PaymentMethod
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
    status: 'pending' | 'success' | 'failed' | string
}

export interface BookingListParams {
    page?: number
    pageSize?: number
}

export interface BookingDraft {
    tripId: number
    selectedSeats: string[]
    guestInfo: GuestInfo
    pickupInfo: PickupPoint
    dropoffInfo: PickupPoint
    paymentMethod: PaymentMethod
}

export interface BookingScreenState {
    trip: Trip
    passengers: number
}
