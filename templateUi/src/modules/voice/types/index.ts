import type { VoiceExecuteResponse, VoicePlanResponse } from './booking'

export interface VoiceTranscribeResponse {
    transcript: string
    engine: string
}

export interface VoicePipelineResponse {
    transcript: string
    parse: {
        command: {
            origin: string
            destination: string
            travel_date?: string
            seat_count?: number
            seat_preference_order?: string[]
            travelDate?: string
            seatCount?: number
            seatPreferenceOrder?: string[]
        } | null
        confidence: number
        missing_fields?: string[]
        missingFields?: string[]
        message: string
    }
    plan?: VoicePlanResponse
    execute?: VoiceExecuteResponse
}

export * from './booking'
