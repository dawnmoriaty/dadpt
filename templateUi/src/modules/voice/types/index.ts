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
            travel_date: string
            seat_count: number
            seat_preference_order: string[]
        } | null
        confidence: number
        missing_fields: string[]
        message: string
    }
    plan?: {
        data?: {
            recommendedTripId?: number
            candidates?: Array<{ tripId: number }>
        }
    }
    execute?: unknown
}

export * from './booking'
