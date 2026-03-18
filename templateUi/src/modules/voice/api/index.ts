import { aiApi } from '@/services/api/ai-client'

import type { VoiceTranscribeResponse } from '../types'

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
}
