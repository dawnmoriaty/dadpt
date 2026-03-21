import { api } from '@/services/api/client'
import { API_ENDPOINTS } from '@/services/api/endpoints'
import { aiApi } from '@/services/api/ai-client'

import type { VoiceExecuteRequest, VoiceExecuteResponse, VoicePlanRequest, VoicePlanResponse, VoiceTranscribeResponse } from '../types'

export const voiceApi = {
    transcribe: async (file: File): Promise<VoiceTranscribeResponse> => {
        const formData = new FormData()
        formData.append('file', file)

        const response = await aiApi.post<VoiceTranscribeResponse>('/api/v2/voice/booking/transcribe', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })

        return response.data
    },

    plan: async (payload: VoicePlanRequest): Promise<VoicePlanResponse> => {
        const response = await api.post<{ data: VoicePlanResponse }>(API_ENDPOINTS.VOICE_BOOKING.PLAN, payload)
        return response.data.data
    },

    execute: async (payload: VoiceExecuteRequest): Promise<VoiceExecuteResponse> => {
        const response = await api.post<{ data: VoiceExecuteResponse }>(API_ENDPOINTS.VOICE_BOOKING.EXECUTE, payload)
        return response.data.data
    },
}
