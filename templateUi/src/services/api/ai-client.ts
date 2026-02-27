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

// ── API ────────────────────────────────────────────────────────────────────

export const aiChatApi = {
    send: async (req: ChatRequest): Promise<ChatResponse> => {
        const { data } = await aiApi.post<ChatResponse>('/api/v1/chat', req)
        return data
    },

    health: async () => {
        const { data } = await aiApi.get('/health')
        return data
    },
}
