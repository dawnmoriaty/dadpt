export interface ToolCallInfo {
    tool_name?: string
    tool?: string
    inputs: string
    output: string
    timestamp: string
}

export interface TripUiActionItem {
    trip_id: number
    provider_name?: string
    origin_name?: string
    destination_name?: string
    departure_time?: string
    arrival_time?: string
    price?: number
    available_seats?: number
    status?: string
    tags?: Array<'best_price' | 'faster' | 'premium'>
    score_explain?: {
        reasons?: string[]
        price?: number
        available_seats?: number
    }
    detail_url?: string
    book_now?: {
        trip_id: number
        passengers?: number
        payment_method?: 'bank_transfer' | 'cod' | 'visa'
    }
}

export interface ChatUiAction {
    type: string
    title?: string
    items?: TripUiActionItem[]
    meta?: {
        origin?: string
        destination?: string
        date?: string
        passengers?: number
    }
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
    ui_actions?: ChatUiAction[]
}

export interface ChatMessage {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: Date
    status?: string
    workflowSlug?: string
    toolCalls?: ToolCallInfo[]
    uiActions?: ChatUiAction[]
}
