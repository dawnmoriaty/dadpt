import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import { useAuthStore } from '@/stores/use-auth-store'

import { chatApi } from '../api'
import type { ChatMessage, ChatResponse } from '../types'
import { toAssistantMessage, toErrorMessage, toUserMessage } from '../utils/message-mapper'
export { useChatInput } from './use-chat-input'

interface ChatState {
    messages: ChatMessage[]
    sessionId: string | null
    isLoading: boolean
    error: string | null
    tenantSlug: string
    sendMessage: (text: string) => Promise<void>
    clearChat: () => void
}

export const useChatStore = create<ChatState>()(
    devtools(
        (set, get) => ({
            messages: [],
            sessionId: null,
            isLoading: false,
            error: null,
            tenantSlug: 'bus',
            sendMessage: async (text: string) => {
                const trimmed = text.trim()
                if (!trimmed) {
                    return
                }

                const { tenantSlug, sessionId } = get()
                const authState = useAuthStore.getState()

                const userMessage = toUserMessage(trimmed)

                set(
                    (state) => ({
                        messages: [...state.messages, userMessage],
                        isLoading: true,
                        error: null,
                    }),
                    false,
                    'chat/sendUserMessage',
                )

                try {
                    const response: ChatResponse = await chatApi.send({
                        tenant_slug: tenantSlug,
                        message: trimmed,
                        session_id: sessionId ?? undefined,
                        user_id: authState.user ? String(authState.user.id) : undefined,
                    })

                    const assistantMessage = toAssistantMessage(response)

                    set(
                        (state) => ({
                            messages: [...state.messages, assistantMessage],
                            sessionId: response.session_id || state.sessionId,
                            isLoading: false,
                        }),
                        false,
                        'chat/sendAssistantMessage',
                    )
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Cannot connect to AI service'

                    const assistantMessage = toErrorMessage(errorMessage)

                    set(
                        (state) => ({
                            messages: [...state.messages, assistantMessage],
                            isLoading: false,
                            error: errorMessage,
                        }),
                        false,
                        'chat/sendError',
                    )
                }
            },
            clearChat: () =>
                set(
                    {
                        messages: [],
                        sessionId: null,
                        error: null,
                    },
                    false,
                    'chat/clear',
                ),
        }),
        { name: 'chat-store' },
    ),
)
