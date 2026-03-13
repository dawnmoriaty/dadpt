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

    // Seat layout from bus type (JSONB)
    seatLayout?: SeatLayout | null
}

export type BusLayoutType = 'seater' | 'sleeper' | 'limousine' | 'limousine_cabin'

export interface SeatLayout {
    type: BusLayoutType
    rows: number
    floors?: number
    columns: string[]  // e.g. ["A","B","","C","D"] — empty string = aisle
    seats: string[]    // e.g. ["A01","B01","C01","D01",...]
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
