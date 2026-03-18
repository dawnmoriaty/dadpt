import axios from 'axios'
import { useMutation } from '@tanstack/react-query'

import { voiceApi } from '../api'
import type { VoiceTranscribeResponse } from '../types'

export function useTranscribeVoice() {
    return useMutation<VoiceTranscribeResponse, Error, File>({
        mutationFn: (file: File) => voiceApi.transcribe(file),
    })
}

export function getVoiceErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const payload = error.response?.data as Record<string, unknown> | undefined
        const detail = payload?.detail
        const message = payload?.message

        if (typeof detail === 'string' && detail.length > 0) return detail
        if (typeof message === 'string' && message.length > 0) return message
        if (typeof error.message === 'string' && error.message.length > 0) return error.message
    }

    if (error instanceof Error && error.message) return error.message
    return 'Không thể xử lý file giọng nói lúc này.'
}
