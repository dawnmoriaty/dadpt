import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import {
    aiChatApi,
    type ChatResponse,
    type ToolCallInfo,
    type VoiceBookingCreateData,
    type VoiceBookingPipelineResponse,
} from '@/services/api/ai-client'
import { useAuthStore } from '@/stores/use-auth-store'

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
const BOOKING_INTENT_PATTERN = /(đặt|book|mua).*(vé|chuyến)|(\d+|một|hai|ba|bốn)\s*(ghế|vé|chỗ).*(từ|đến|tới)/i

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
                const authState = useAuthStore.getState()

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
                    if (isBookingIntent(text)) {
                        if (!authState.isAuthenticated || !authState.token) {
                            const botMsg: ChatMessage = {
                                id: nextId(),
                                role: 'assistant',
                                content: 'Mình có thể hỗ trợ đặt vé bằng AI, nhưng bạn cần đăng nhập trước. Sau khi đăng nhập, hãy nhắn theo mẫu: "Đặt cho tôi 2 vé từ Sài Gòn đến Nha Trang ngày 2026-03-21".',
                                timestamp: new Date(),
                                status: 'requires_auth',
                                workflowSlug: 'voice-booking',
                            }

                            set(
                                (s) => ({
                                    messages: [...s.messages, botMsg],
                                    isLoading: false,
                                }),
                                false,
                                'sendMessage/bookingRequiresAuth',
                            )
                            return
                        }

                        const bookingResponse = await aiChatApi.runVoiceBookingPipeline({
                            transcript: text,
                            bearerToken: authState.token,
                        })

                        const botMsg: ChatMessage = {
                            id: nextId(),
                            role: 'assistant',
                            content: formatVoiceBookingMessage(bookingResponse),
                            timestamp: new Date(),
                            status: bookingResponse.booking?.data?.bookingResult ? 'success' : 'needs_input',
                            workflowSlug: 'voice-booking',
                        }

                        set(
                            (s) => ({
                                messages: [...s.messages, botMsg],
                                isLoading: false,
                            }),
                            false,
                            'sendMessage/voiceBooking',
                        )
                        return
                    }

                    const res: ChatResponse = await aiChatApi.send({
                        tenant_slug: tenantSlug,
                        message: text,
                        session_id: sessionId ?? undefined,
                        user_id: authState.user ? String(authState.user.id) : undefined,
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

function isBookingIntent(text: string): boolean {
    return BOOKING_INTENT_PATTERN.test(text.trim())
}

function formatVoiceBookingMessage(result: VoiceBookingPipelineResponse): string {
    if (!result.parse.command) {
        const missing = result.parse.missing_fields.map(toVietnameseField).join(', ')
        return [
            'Mình chưa đủ dữ liệu để đặt vé.',
            missing ? `Bạn bổ sung giúp mình: ${missing}.` : result.parse.message,
            'Ví dụ: "Đặt cho tôi 2 vé từ Hà Nội đến Đà Nẵng ngày 2026-03-21".',
        ].filter(Boolean).join('\n')
    }

    if (result.submit?.data && !result.submit.data.accepted) {
        return [
            'Mình đã hiểu yêu cầu nhưng chưa thể tạo booking.',
            result.submit.data.reason || 'Thông tin hồ sơ hoặc câu lệnh chưa hợp lệ.',
        ].join('\n')
    }

    const bookingData = result.booking?.data
    if (bookingData?.bookingResult) {
        return formatSuccessfulBookingMessage(bookingData)
    }

    const command = result.parse.command
    return [
        'Mình đã nhận thông tin chuyến đi.',
        `Tuyến: ${command.origin} -> ${command.destination}`,
        `Ngày đi: ${command.travel_date}`,
        `Số ghế: ${command.seat_count}`,
        'Nhưng chưa tạo được booking. Bạn thử lại sau ít phút nhé.',
    ].join('\n')
}

function formatSuccessfulBookingMessage(data: VoiceBookingCreateData): string {
    const booking = data.bookingResult.booking
    const lines = [
        'Mình đã đặt vé thành công cho bạn.',
        `Tuyến: ${data.origin} -> ${data.destination}`,
        `Ngày đi: ${data.travelDate}`,
        `Mã đặt vé: ${booking.code}`,
        `Mã đơn hàng: ${data.bookingResult.orderCode}`,
        `Ghế: ${(data.seatCodes.length ? data.seatCodes : booking.seatCodes).join(', ')}`,
        `Người đặt: ${booking.guestInfo?.name ?? 'Khách hàng'}`,
        `Số điện thoại: ${booking.guestInfo?.phone ?? 'Không có'}`,
        `Thanh toán: ${booking.paymentMethod}`,
    ]

    if (data.bookingResult.paymentUrl) {
        lines.push('Booking đã được tạo. Bạn tiếp tục thanh toán ở trang xác nhận đặt vé nhé.')
    }

    return lines.join('\n')
}

function toVietnameseField(field: string): string {
    switch (field) {
    case 'origin':
        return 'điểm đi'
    case 'destination':
        return 'điểm đến'
    case 'travel_date':
        return 'ngày đi'
    default:
        return field
    }
}
