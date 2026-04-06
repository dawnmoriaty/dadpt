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
    image_url?: string
    description?: string
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
    buttons?: ChatActionButton[]
    cta?: {
        label: string
        action: 'open_search' | 'prefill_message'
        payload?: {
            origin?: string
            destination?: string
            date?: string
            passengers?: number
            message?: string
        }
    }
}

export interface ChatActionButton {
    label: string
    action: 'open_url' | 'book_ticket' | 'open_search' | 'prefill_message'
    value?: string | ChatActionButtonValue
}

export interface ChatActionButtonValue {
    trip_id?: number
    passengers?: number
    payment_method?: 'bank_transfer' | 'cod' | 'visa'
    origin?: string
    destination?: string
    date?: string
    message?: string
}

export interface ChatQuickReplyOption {
    label: string
    value: string
}

export interface ChatUiAction {
    type: string
    title?: string
    items?: TripUiActionItem[]
    options?: Array<string | ChatQuickReplyOption>
    prompt?: string
    payload?: BookingConfirmationPayload
    meta?: {
        origin?: string
        destination?: string
        origin_province?: string
        destination_province?: string
        date?: string
        time?: string
        passengers?: number
        page?: number
        limit?: number
        count?: number
    }
}

export interface BookingConfirmationPayload {
    mode: 'live'
    booking_code: string
    trip_id?: number
    status?: string
    seat_codes?: string[]
    payment_method?: string
    message?: string
}

export interface ChatRequest {
    tenant_slug: string
    message: string
    session_id?: string
    user_id?: string
    page?: number
    limit?: number
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
