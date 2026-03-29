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
    orderCode?: string
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

export interface AdminBookingListParams {
    page?: number
    pageSize?: number
    status?: BookingStatus | ''
    tripId?: number
    search?: string
}

export interface AdminBookingStats {
    totalBookings: number
    unpaidBookings: number
    paidBookings: number
    refundPendingBookings: number
    cancelledBookings: number
    paidRevenue: number
    unpaidRevenue: number
    activeTripCount: number
}

export interface TripSeatAssignment {
    seatCode: string
    booking: Booking
}

export interface TripSeatManifestResponse {
    tripId: number
    seatCount: number
    items: TripSeatAssignment[]
}

export interface AdminRevenueSeriesPoint {
    date: string
    totalBookings: number
    paidBookings: number
    unpaidBookings: number
    paidRevenue: number
}

export interface AdminRevenueSeriesResponse {
    days: number
    items: AdminRevenueSeriesPoint[]
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
    confirmCode?: string
}

export interface RefundRequestListResponse {
    items: Booking[]
    total: number
    page: number
    pageSize: number
}

export interface AdminBookingListResponse {
    items: Booking[]
    total: number
    page: number
    pageSize: number
}

export interface AdminUpdateBookingStatusRequest {
    status: 'pending' | 'paid' | 'cancelled' | 'expired'
}
