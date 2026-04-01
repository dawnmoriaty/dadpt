import { api } from '@/services/api/client'

import type { ChatRequest, ChatResponse } from '../types'

const CHAT_TIMEOUT_MS = 120_000

function normalizeChatResponse(raw: unknown): ChatResponse {
    const root = (raw ?? {}) as Record<string, unknown>
    const nested = (root.data ?? null) as Record<string, unknown> | null
    const source = nested && typeof nested === 'object' ? nested : root

    return {
        message: String(source.message ?? ''),
        status: String(source.status ?? ''),
        session_id: String(source.session_id ?? source.sessionId ?? ''),
        workflow_slug: String(source.workflow_slug ?? source.workflowSlug ?? ''),
        tool_calls: Array.isArray(source.tool_calls)
            ? (source.tool_calls as ChatResponse['tool_calls'])
            : Array.isArray(source.toolCalls)
              ? (source.toolCalls as ChatResponse['tool_calls'])
              : [],
        ui_actions: Array.isArray(source.ui_actions)
            ? (source.ui_actions as NonNullable<ChatResponse['ui_actions']>)
            : Array.isArray(source.uiActions)
              ? (source.uiActions as NonNullable<ChatResponse['ui_actions']>)
              : [],
    }
}

export const chatApi = {
    send: async (payload: ChatRequest): Promise<ChatResponse> => {
        const { data } = await api.post<ChatResponse>('/ai/chat', payload, { timeout: CHAT_TIMEOUT_MS })
        return normalizeChatResponse(data)
    },
}
