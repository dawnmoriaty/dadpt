import { Loader2, MessageSquare, Send } from 'lucide-react'
import { useEffect, useRef, type KeyboardEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import type { BookingConfirmationPayload, ChatMessage, ChatQuickReplyOption } from '../types'

import { ChatPreviewSuggestions } from './ChatPreviewSuggestions'
import { ChatQuickReplies } from './ChatQuickReplies'
import { ChatTripActionCard } from './ChatTripActionCard'

interface ChatMessagesProps {
    messages: ChatMessage[]
    isLoading: boolean
    input: string
    onInputChange: (value: string) => void
    onSend: () => void
    sendMessage: (text: string) => Promise<void>
    loadNextPage: (text: string) => Promise<void>
}

export function ChatMessages({ messages, isLoading, input, onInputChange, onSend, sendMessage, loadNextPage }: ChatMessagesProps) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isLoading])

    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            onSend()
        }
    }

    return (
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6" ref={scrollRef}>
                {messages.length === 0 ? (
                    <EmptyState sendMessage={sendMessage} isLoading={isLoading} />
                ) : (
                    <div className="space-y-4">
                        {messages.map((message) => (
                            <div key={message.id} className="space-y-2">
                                <MessageBubble message={message} />
                                <TripActionList message={message} isLoading={isLoading} loadNextPage={loadNextPage} />
                                <BookingConfirmationList message={message} />
                                <QuickReplyList message={message} isLoading={isLoading} sendMessage={sendMessage} />
                            </div>
                        ))}
                        {isLoading && <TypingIndicator />}
                    </div>
                )}
            </div>

            <div className="border-t bg-background p-4">
                <div className="flex gap-2">
                    <Input
                        ref={inputRef}
                        value={input}
                        onChange={(event) => onInputChange(event.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Nhập điểm đi, điểm đến, ngày/giờ đi, số ghế (tùy chọn)..."
                        disabled={isLoading}
                        className="flex-1"
                    />
                    <Button onClick={onSend} disabled={!input.trim() || isLoading} size="icon" className="h-10 w-10">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
        </Card>
    )
}

interface EmptyStateProps {
    sendMessage: (text: string) => Promise<void>
    isLoading: boolean
}

function EmptyState({ sendMessage, isLoading }: EmptyStateProps) {
    return (
        <div className="flex min-h-96 h-full flex-col items-center justify-center text-muted-foreground">
            <div className="mb-4 rounded-full bg-primary/10 p-3">
                <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <p className="text-center text-lg font-semibold text-foreground">Xin chào!</p>
            <p className="mt-1 text-center text-sm">Tôi có thể giúp bạn tìm chuyến và đặt vé</p>
            <p className="mt-4 text-sm">Bạn có thể thử các câu như:</p>
            <div className="mt-4 space-y-2">
                <SuggestionButton
                    text="Tìm chuyến Sài Gòn đi Nha Trang ngày 2026-03-21 lúc 09:00, 2 ghế"
                    onClick={() => sendMessage('Tìm chuyến Sài Gòn đi Nha Trang ngày 2026-03-21 lúc 09:00, 2 ghế')}
                    disabled={isLoading}
                />
                <SuggestionButton
                    text="Tìm chuyến từ Hà Nội đến Đà Nẵng ngày mai lúc 7h"
                    onClick={() => sendMessage('Tìm chuyến từ Hà Nội đến Đà Nẵng ngày mai lúc 7h')}
                    disabled={isLoading}
                />
                <SuggestionButton
                    text="Kiểm tra booking của tôi"
                    onClick={() => sendMessage('Kiểm tra booking của tôi')}
                    disabled={isLoading}
                />
            </div>

            <div className="w-full max-w-5xl">
                <ChatPreviewSuggestions />
            </div>
        </div>
    )
}

interface SuggestionButtonProps {
    text: string
    onClick: () => void
    disabled?: boolean
}

function SuggestionButton({ text, onClick, disabled }: SuggestionButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="w-full rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-center text-sm text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
            {`"${text}"`}
        </button>
    )
}

function MessageBubble({ message }: { message: ChatMessage }) {
    const isUser = message.role === 'user'
    const isError = message.status === 'error'
    const formattedLines = formatMessageContent(message.content)
    const hasTripCards = (message.uiActions ?? []).some(
        (action) =>
            (action.type === 'trip_recommendations' || action.type === 'related_trip_recommendations') &&
            (action.items?.length ?? 0) > 0,
    )

    return (
        <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
            <div
                className={cn(
                    'max-w-[92%] rounded-2xl px-4 py-3 text-sm shadow-sm md:max-w-[85%]',
                    isUser
                        ? 'rounded-br-none bg-primary text-primary-foreground'
                        : isError
                          ? 'rounded-bl-none border border-destructive/30 bg-destructive/10 text-destructive'
                          : hasTripCards
                            ? 'rounded-bl-none border border-border/40 bg-muted/40 text-muted-foreground'
                            : 'rounded-bl-none border border-border/60 bg-background text-foreground',
                )}
            >
                <div className={cn('space-y-2', hasTripCards && 'space-y-1')}>
                    {formattedLines.map((line, index) => (
                        <p
                            key={`${message.id}-line-${index}`}
                            className={cn(
                                'break-words whitespace-pre-wrap',
                                hasTripCards ? 'text-[13px] leading-6' : 'leading-7',
                                line.variant === 'heading' && 'font-semibold',
                                line.variant === 'bullet' && 'pl-2',
                            )}
                        >
                            {line.text}
                        </p>
                    ))}
                </div>
            </div>
        </div>
    )
}

function TripActionList({
    message,
    isLoading,
    loadNextPage,
}: {
    message: ChatMessage
    isLoading: boolean
    loadNextPage: (text: string) => Promise<void>
}) {
    const actions = (message.uiActions ?? []).filter(
        (action) =>
            (action.type === 'trip_recommendations' || action.type === 'related_trip_recommendations') &&
            (action.items?.length ?? 0) > 0,
    )

    if (actions.length === 0 || message.role !== 'assistant') {
        return null
    }

    return (
        <div className="space-y-3 pl-2 pr-1">
            {actions.map((action, actionIndex) => (
                <section key={`trip-action-group-${message.id}-${action.type}-${actionIndex}`} className="space-y-2">
                    {(action.title || action.prompt) && (
                        <div className="space-y-1 px-1">
                            {action.title ? <p className="text-sm font-semibold text-foreground">{action.title}</p> : null}
                            {action.prompt ? <p className="text-xs text-muted-foreground">{action.prompt}</p> : null}
                            {(action.meta?.origin_province ?? action.meta?.origin) &&
                            (action.meta?.destination_province ?? action.meta?.destination) ? (
                                <p className="text-[11px] text-muted-foreground/90">
                                    Đang tìm theo toàn bộ bến xe: {action.meta?.origin_province ?? action.meta?.origin}
                                    {' -> '}
                                    {action.meta?.destination_province ?? action.meta?.destination}
                                </p>
                            ) : null}
                        </div>
                    )}

                    <div className="space-y-3">
                        {(action.items ?? []).map((item, itemIndex) => (
                            <ChatTripActionCard
                                key={`trip-action-${message.id}-${action.type}-${actionIndex}-${item.trip_id}-${itemIndex}`}
                                item={item}
                                defaultPassengers={Math.max(1, Number(action.meta?.passengers ?? 1))}
                            />
                        ))}
                    </div>

                    {action.type === 'trip_recommendations' && (action.items?.length ?? 0) > 0 ? (
                        <div className="px-1">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isLoading}
                                onClick={() => {
                                    const origin = action.meta?.origin_province ?? action.meta?.origin
                                    const destination = action.meta?.destination_province ?? action.meta?.destination
                                    if (!origin || !destination) {
                                        return
                                    }

                                    const dateText = action.meta?.date ? ` ngay ${action.meta.date}` : ''
                                    const text = `tim cac chuyen tu ${origin} ve ${destination}${dateText}`
                                    void loadNextPage(text)
                                }}
                            >
                                Xem them chuyen
                            </Button>
                        </div>
                    ) : null}
                </section>
            ))}
        </div>
    )
}

function QuickReplyList({
    message,
    isLoading,
    sendMessage,
}: {
    message: ChatMessage
    isLoading: boolean
    sendMessage: (text: string) => Promise<void>
}) {
    if (message.role !== 'assistant') {
        return null
    }

    const quickReplyOptions = (message.uiActions ?? [])
        .flatMap((action) => action.options ?? [])
        .map(normalizeQuickReply)
        .filter((value): value is ChatQuickReplyOption => Boolean(value))

    const uniqueOptions = Array.from(new Map(quickReplyOptions.map((option) => [option.value.trim().toLowerCase(), option])).values()).slice(
        0,
        6,
    )
    if (uniqueOptions.length === 0) {
        return null
    }

    return (
        <div className="space-y-2 pl-2 pr-1">
            <p className="text-xs font-medium text-muted-foreground">Gợi ý trả lời nhanh:</p>
            <ChatQuickReplies options={uniqueOptions} disabled={isLoading} onSelect={(value) => void sendMessage(value)} />
        </div>
    )
}

function normalizeQuickReply(option: string | ChatQuickReplyOption): ChatQuickReplyOption | null {
    if (typeof option === 'string') {
        const value = option.trim()
        return value ? { label: value, value } : null
    }

    const value = option.value.trim()
    if (!value) {
        return null
    }

    return {
        label: option.label.trim() || value,
        value,
    }
}

function BookingConfirmationList({ message }: { message: ChatMessage }) {
    if (message.role !== 'assistant') {
        return null
    }

    const confirmations = (message.uiActions ?? []).filter(
        (action) => action.type === 'booking_confirmation' && action.payload,
    )

    if (confirmations.length === 0) {
        return null
    }

    return (
        <div className="space-y-2 pl-2 pr-1">
            {confirmations.map((action, index) => (
                <BookingConfirmationCard
                    key={`booking-confirm-${message.id}-${index}`}
                    payload={action.payload!}
                />
            ))}
        </div>
    )
}

function BookingConfirmationCard({ payload }: { payload: BookingConfirmationPayload }) {
    const isMock = payload.mode === 'mock'

    return (
        <div className="rounded-xl border border-border/60 bg-background p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🎫</span>
                <span className="text-sm font-semibold text-foreground">Xác nhận đặt vé</span>
                {isMock && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        MOCK
                    </span>
                )}
            </div>

            <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Mã vé</span>
                    <span className="font-mono font-medium text-foreground">{payload.booking_code}</span>
                </div>
                {payload.seat_codes && payload.seat_codes.length > 0 && (
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Ghế</span>
                        <span className="font-medium text-foreground">{payload.seat_codes.join(', ')}</span>
                    </div>
                )}
                {payload.status && (
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Trạng thái</span>
                        <span className="font-medium text-foreground">{payload.status}</span>
                    </div>
                )}
                {payload.payment_method && (
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Thanh toán</span>
                        <span className="font-medium text-foreground">{payload.payment_method.toUpperCase()}</span>
                    </div>
                )}
            </div>

            {payload.message && (
                <p className="mt-3 text-xs text-muted-foreground italic">{payload.message}</p>
            )}
        </div>
    )
}

function TypingIndicator() {
    return (
        <div className="flex justify-start gap-3">
            <div className="rounded-lg rounded-bl-none bg-muted px-4 py-3">
                <div className="flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:0ms]" />
                    <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:150ms]" />
                    <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:300ms]" />
                </div>
            </div>
        </div>
    )
}

function formatMessageContent(content: string): Array<{ text: string; variant: 'body' | 'heading' | 'bullet' }> {
    return content
        .split('\n')
        .map((line) => line.trim())
        .filter((line, index, lines) => line.length > 0 || (index > 0 && lines[index - 1].length > 0))
        .map((line) => {
            const normalized = line.replace(/^#{1,6}\s*/, '').replace(/\*\*/g, '').trim()
            if (line.startsWith('###') || line.startsWith('##')) {
                return { text: normalized, variant: 'heading' as const }
            }
            if (normalized.startsWith('- ')) {
                return { text: `• ${normalized.slice(2).trim()}`, variant: 'bullet' as const }
            }
            return { text: normalized, variant: 'body' as const }
        })
}
