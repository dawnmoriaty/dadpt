// Booking module types

export type BookingStatus = 'pending' | 'paid' | 'cancelled' | 'expired'

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

export interface BookingListParams {
    page?: number
    pageSize?: number
}
