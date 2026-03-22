import { api } from '@/services/api/client'
import { API_ENDPOINTS } from '@/services/api/endpoints'

import type {
    VoiceExecuteRequest,
    VoiceExecuteResponse,
    VoicePipelineResponse,
    VoicePlanRequest,
    VoicePlanResponse,
    VoiceTranscribeResponse,
} from '../types'

export const voiceApi = {
    transcribe: async (file: File): Promise<VoiceTranscribeResponse> => {
        const formData = new FormData()
        formData.append('file', file)

        const response = await api.post<{ data: VoiceTranscribeResponse }>(API_ENDPOINTS.VOICE_BOOKING.TRANSCRIBE, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })

        return response.data.data
    },

    pipeline: async (file: File, execute = false): Promise<VoicePipelineResponse> => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('execute', String(execute))
        formData.append('paymentMethod', 'bank_transfer')

        const response = await api.post<{ data: VoicePipelineResponse }>(API_ENDPOINTS.VOICE_BOOKING.PIPELINE, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })

        return response.data.data
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
