import axios from 'axios'

/**
 * Separate axios instance for AI Service (direct FE → AI).
 * No auth interceptors needed — AI service uses tenant_slug, not JWT.
 */
const AI_BASE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8100'

export const aiApi = axios.create({
    baseURL: AI_BASE_URL,
    timeout: 120_000, // LLM calls can be slow
    headers: {
        'Content-Type': 'application/json',
    },
})

export interface VoiceBookingCommand {
    origin: string
    destination: string
    travel_date: string
    seat_count: number
    seat_preference_order: string[]
}

export interface VoiceBookingParseResult {
    command: VoiceBookingCommand | null
    confidence: number
    missing_fields: string[]
    message: string
}

export interface VoiceBookingValidationData {
    accepted: boolean
    reasonCode: string
    reason: string
    normalizedCommand?: {
        userId: number
        origin: string
        destination: string
        travelDate: string
        seatCount: number
        seatPreferenceOrder?: string[]
    }
    profileSource?: string
    maskedPhone?: string
    maskedEmail?: string
}

export interface VoiceBookingCreateData {
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
            guestInfo?: {
                name: string
                phone: string
                email?: string
            }
            pickupInfo?: {
                name: string
            }
            dropoffInfo?: {
                name: string
            }
        }
        orderCode: string
        paymentUrl?: string
        qrCode?: string
    }
}

// ── API ────────────────────────────────────────────────────────────────────

export const aiChatApi = {
    health: async () => {
        const { data } = await aiApi.get('/health')
        return data
    },
}
