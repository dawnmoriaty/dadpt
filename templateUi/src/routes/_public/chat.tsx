'use client'

import { createFileRoute } from '@tanstack/react-router'
import { Bot, Loader2, MessageSquare, Send, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { type ChatMessage, useChatStore } from '@/modules/chat'

export const Route = createFileRoute('/_public/chat')({
    component: ChatPageWrapper,
})

// ── Main Chat Page Component ───────────────────────────────────────────────

function ChatPageWrapper() {
    return <ChatPage />
}

function ChatPage() {
    const { messages, isLoading, sendMessage, clearChat } = useChatStore()
    const [input, setInput] = useState('')
    const scrollRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Auto-scroll on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isLoading])

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    const handleSend = async () => {
        const text = input.trim()
        if (!text || isLoading) return
        setInput('')
        await sendMessage(text)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className="container mx-auto max-w-4xl flex flex-col gap-6 py-6 px-4 h-[calc(100vh-6rem)]">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                        <Bot className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">AI hỗ trợ đặt vé</h1>
                        <p className="text-sm text-muted-foreground">Đặt vé bằng giọng nói hoặc văn bản</p>
                    </div>
                </div>
                {messages.length > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={clearChat}
                        className="gap-2"
                    >
                        <Trash2 className="h-4 w-4" />
                        Xóa
                    </Button>
                )}
            </div>

            {/* Voice Panel */}
            <VoiceBookingPanel onTranscript={sendMessage} disabled={isLoading} />

            {/* Messages Area */}
            <Card className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6" ref={scrollRef}>
                    {messages.length === 0 ? (
                        <EmptyState sendMessage={sendMessage} isLoading={isLoading} />
                    ) : (
                        <div className="space-y-4">
                            {messages.map((msg) => (
                                <MessageBubble key={msg.id} message={msg} />
                            ))}
                            {isLoading && <TypingIndicator />}
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="border-t bg-background p-4">
                    <div className="flex gap-2">
                        <Input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Nhập yêu cầu... (VD: Đặt 2 vé từ Sài Gòn đến Nha Trang ngày 2026-03-21)"
                            disabled={isLoading}
                            className="flex-1"
                        />
                        <Button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            size="icon"
                            className="h-10 w-10"
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    )
}

// ── Sub-components ─────────────────────────────────────────────────────────

interface EmptyStateProps {
    sendMessage: (text: string) => Promise<void>
    isLoading: boolean
}

function EmptyState({ sendMessage, isLoading }: EmptyStateProps) {
    return (
        <div className="flex h-full flex-col items-center justify-center min-h-96 text-muted-foreground">
            <div className="mb-4 rounded-full bg-primary/10 p-3">
                <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <p className="text-center text-lg font-semibold text-foreground">Xin chào!</p>
            <p className="mt-1 text-center text-sm">Tôi có thể giúp bạn tìm chuyến và đặt vé</p>
            <p className="mt-4 text-sm">Bạn có thể thử các câu như:</p>
            <div className="mt-4 space-y-2">
                <SuggestionButton text="Đặt 2 vé từ Sài Gòn đến Nha Trang ngày 2026-03-21" onClick={() => sendMessage('Đặt 2 vé từ Sài Gòn đến Nha Trang ngày 2026-03-21')} disabled={isLoading} />
                <SuggestionButton text="Tìm chuyến từ Hà Nội đến Đà Nẵng ngày mai" onClick={() => sendMessage('Tìm chuyến từ Hà Nội đến Đà Nẵng ngày mai')} disabled={isLoading} />
                <SuggestionButton text="Kiểm tra booking của tôi" onClick={() => sendMessage('Kiểm tra booking của tôi')} disabled={isLoading} />
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
            className="w-full rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-center text-sm text-primary transition-colors hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {`"${text}"`}
        </button>
    )
}

function MessageBubble({ message }: { message: ChatMessage }) {
    const isUser = message.role === 'user'
    const isError = message.status === 'error'

    return (
        <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
            <div
                className={cn(
                    'max-w-[70%] rounded-lg px-4 py-3 text-sm leading-relaxed',
                    isUser
                        ? 'rounded-br-none bg-primary text-primary-foreground'
                        : isError
                          ? 'rounded-bl-none border border-destructive/30 bg-destructive/10 text-destructive'
                          : 'rounded-bl-none bg-muted text-foreground',
                )}
            >
                <div className="space-y-2">
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>

                    {/* Workflow / tool info */}
                    {message.workflowSlug && (
                        <div className="mt-2 border-t pt-2 text-xs opacity-70">
                            <span className="font-medium">workflow:</span> {message.workflowSlug}
                        </div>
                    )}
                    {message.toolCalls && message.toolCalls.length > 0 && (
                        <div className="mt-2 border-t pt-2 text-xs opacity-70">
                            <span className="font-medium">tools:</span> {message.toolCalls.map((tc) => tc.tool_name).join(', ')}
                        </div>
                    )}
                </div>
            </div>
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
