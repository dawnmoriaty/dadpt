export interface VoicePlanRequest {
    origin: string
    destination: string
    travelDate: string
    seatCount: number
    seatPreferenceOrder?: string[]
}

export interface VoiceTripCandidate {
    tripId: number
    providerName?: string
    busTypeName?: string
    originName?: string
    destinationName?: string
    departureTime: string
    arrivalTime: string
    finalPrice: number
    availableSeats: number
    status: string
    suggestedSeatCodes?: string[]
}

export interface VoicePlanResponse {
    flow: string
    origin: string
    destination: string
    travelDate: string
    seatCount: number
    recommendedTripId: number
    candidates: VoiceTripCandidate[]
}

export interface VoiceExecuteRequest {
    tripId: number
    seatCount: number
    seatPreferenceOrder?: string[]
    paymentMethod?: 'bank_transfer' | 'cod' | 'visa'
}

export interface VoiceExecuteResponse {
    flow: string
    tripId: number
    seatCodes: string[]
    travelDate: string
    origin: string
    destination: string
    bookingResult: {
        booking: {
            id: number
            code: string
            tripId: number
            seatCodes: string[]
            totalAmount: number
            status: string
            paymentMethod: string
            createdAt: string
            expiresAt?: string
        }
        orderCode: string
        paymentUrl?: string
        qrCode?: string
    }
}
