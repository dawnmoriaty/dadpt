import axios from 'axios'

/**
 * Separate axios instance for AI Service (direct FE → AI).
 * No auth interceptors needed — AI service uses tenant_slug, not JWT.
 */
const AI_BASE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8100'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'
const BACKEND_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '')

export const aiApi = axios.create({
    baseURL: AI_BASE_URL,
    timeout: 120_000, // LLM calls can be slow
    headers: {
        'Content-Type': 'application/json',
    },
})

// ── Types ──────────────────────────────────────────────────────────────────

export interface ChatRequest {
    tenant_slug: string
    message: string
    session_id?: string
    user_id?: string
}

export interface ToolCallInfo {
    tool_name: string
    inputs: string
    output: string
    timestamp: string
}

export interface ChatResponse {
    message: string
    status: string
    session_id: string
    workflow_slug: string
    tool_calls: ToolCallInfo[]
}

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

export interface VoiceBookingPipelineResponse {
    parse: VoiceBookingParseResult
    submit?: {
        code?: number
        status?: string
        message?: string
        data?: VoiceBookingValidationData
    } | null
    booking?: {
        code?: number
        status?: string
        message?: string
        data?: VoiceBookingCreateData
    } | null
}

export interface VoiceBookingPipelineRequest {
    transcript: string
    bearerToken: string
    executeBooking?: boolean
    paymentMethod?: string
}

// ── API ────────────────────────────────────────────────────────────────────

export const aiChatApi = {
    send: async (req: ChatRequest): Promise<ChatResponse> => {
        const { data } = await aiApi.post<ChatResponse>('/api/v1/chat', req)
        return data
    },

    runVoiceBookingPipeline: async (req: VoiceBookingPipelineRequest): Promise<VoiceBookingPipelineResponse> => {
        const { data } = await aiApi.post<VoiceBookingPipelineResponse>('/api/v2/voice/booking/pipeline', {
            transcript: req.transcript,
            backend_base_url: BACKEND_BASE_URL,
            bearer_token: req.bearerToken,
            execute_booking: req.executeBooking ?? true,
            payment_method: req.paymentMethod ?? 'bank_transfer',
        })
        return data
    },

    health: async () => {
        const { data } = await aiApi.get('/health')
        return data
    },
}
