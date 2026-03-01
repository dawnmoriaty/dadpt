// Trip module types

export type TripStatus = 'scheduled' | 'departed' | 'completed' | 'cancelled'

export interface Trip {
    id: number
    providerId: number
    providerName: string
    busTypeName?: string
    originName: string
    originCity: string
    destinationName: string
    destinationCity: string
    departureTime: string
    arrivalTime: string
    basePrice: number
    finalPrice: number
    availableSeats: number
    isHotDeal: boolean
    status: TripStatus
    pickupPoints: Point[]
    dropoffPoints: Point[]
    bookedSeats: string[]

    // Image URL from related bus
    busImageUrl?: string | null
}

export interface Point {
    name: string
    time: string
    surcharge: number
}

export interface CreateTripRequest {
    providerId: number
    busId: number
    originId: number
    destinationId: number
    departureTime: string
    arrivalTime: string
    basePrice: number
    availableSeats: number
    pickupPoints?: Point[]
    dropoffPoints?: Point[]
}

export interface UpdateTripRequest {
    departureTime?: string
    arrivalTime?: string
    basePrice?: number
    isHotDeal?: boolean
    pickupPoints?: Point[]
    dropoffPoints?: Point[]
}

export interface TripListParams {
    page?: number
    pageSize?: number
    providerId?: number
    status?: TripStatus
}
