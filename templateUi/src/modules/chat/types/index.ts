export interface ToolCallInfo {
    tool_name: string
    inputs: string
    output: string
    timestamp: string
}

export interface ChatRequest {
    tenant_slug: string
    message: string
    session_id?: string
    user_id?: string
}

export interface ChatResponse {
    message: string
    status: string
    session_id: string
    workflow_slug: string
    tool_calls: ToolCallInfo[]
}

export interface ChatMessage {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: Date
    status?: string
    workflowSlug?: string
    toolCalls?: ToolCallInfo[]
}
