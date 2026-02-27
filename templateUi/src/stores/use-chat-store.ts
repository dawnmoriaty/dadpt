import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import { aiChatApi, type ChatResponse, type ToolCallInfo } from '@/services/api/ai-client'

// ── Types ──────────────────────────────────────────────────────────────────

export interface ChatMessage {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: Date
    status?: string
    workflowSlug?: string
    toolCalls?: ToolCallInfo[]
}

interface ChatState {
    messages: ChatMessage[]
    sessionId: string | null
    isLoading: boolean
    error: string | null
    tenantSlug: string

    // Actions
    sendMessage: (text: string) => Promise<void>
    clearChat: () => void
    setTenantSlug: (slug: string) => void
}

let messageCounter = 0
const nextId = () => `msg_${++messageCounter}_${Date.now()}`

// ── Store ──────────────────────────────────────────────────────────────────

export const useChatStore = create<ChatState>()(
    devtools(
        (set, get) => ({
            messages: [],
            sessionId: null,
            isLoading: false,
            error: null,
            tenantSlug: 'bus',

            sendMessage: async (text: string) => {
                const { tenantSlug, sessionId } = get()

                // Add user message
                const userMsg: ChatMessage = {
                    id: nextId(),
                    role: 'user',
                    content: text,
                    timestamp: new Date(),
                }
                set(
                    (s) => ({ messages: [...s.messages, userMsg], isLoading: true, error: null }),
                    false,
                    'sendMessage/user',
                )

                try {
                    const res: ChatResponse = await aiChatApi.send({
                        tenant_slug: tenantSlug,
                        message: text,
                        session_id: sessionId ?? undefined,
                    })

                    const botMsg: ChatMessage = {
                        id: nextId(),
                        role: 'assistant',
                        content: res.message || '(empty response)',
                        timestamp: new Date(),
                        status: res.status,
                        workflowSlug: res.workflow_slug,
                        toolCalls: res.tool_calls,
                    }

                    set(
                        (s) => ({
                            messages: [...s.messages, botMsg],
                            sessionId: res.session_id || s.sessionId,
                            isLoading: false,
                        }),
                        false,
                        'sendMessage/bot',
                    )
                } catch (err: unknown) {
                    const errorMsg =
                        err instanceof Error ? err.message : 'Không thể kết nối tới AI service'

                    const errBotMsg: ChatMessage = {
                        id: nextId(),
                        role: 'assistant',
                        content: `⚠️ Lỗi: ${errorMsg}`,
                        timestamp: new Date(),
                        status: 'error',
                    }

                    set(
                        (s) => ({
                            messages: [...s.messages, errBotMsg],
                            isLoading: false,
                            error: errorMsg,
                        }),
                        false,
                        'sendMessage/error',
                    )
                }
            },

            clearChat: () =>
                set(
                    { messages: [], sessionId: null, error: null },
                    false,
                    'clearChat',
                ),

            setTenantSlug: (slug: string) =>
                set({ tenantSlug: slug }, false, 'setTenantSlug'),
        }),
        { name: 'chat-store' },
    ),
)
