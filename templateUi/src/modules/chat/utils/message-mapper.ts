import type { ChatMessage, ChatResponse } from '../types'

let messageCounter = 0

function nextId() {
    messageCounter += 1
    return `msg_${messageCounter}_${Date.now()}`
}

export function toUserMessage(content: string): ChatMessage {
    return {
        id: nextId(),
        role: 'user',
        content,
        timestamp: new Date(),
    }
}

export function toAssistantMessage(response: ChatResponse): ChatMessage {
    return {
        id: nextId(),
        role: 'assistant',
        content: response.message || '(empty response)',
        timestamp: new Date(),
        status: response.status,
        workflowSlug: response.workflow_slug,
        toolCalls: response.tool_calls,
        uiActions: response.ui_actions ?? [],
    }
}

export function toErrorMessage(errorMessage: string): ChatMessage {
    return {
        id: nextId(),
        role: 'assistant',
        content: `Warning: ${errorMessage}`,
        timestamp: new Date(),
        status: 'error',
    }
}
