import { aiApi } from '@/services/api/ai-client'

import type { ChatRequest, ChatResponse } from '../types'

export const chatApi = {
    send: async (payload: ChatRequest): Promise<ChatResponse> => {
        const { data } = await aiApi.post<ChatResponse>('/api/v1/chat', payload)
        return data
    },
}
