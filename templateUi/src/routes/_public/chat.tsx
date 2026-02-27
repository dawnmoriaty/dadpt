import { createFileRoute } from '@tanstack/react-router'
import { Bot, Loader2, MessageSquare, Send, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useChatStore, type ChatMessage } from '@/stores/use-chat-store'

export const Route = createFileRoute('/_public/chat')({
    component: ChatPage,
})

// ── Chat Page ──────────────────────────────────────────────────────────────

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

    const handleSend = () => {
        const text = input.trim()
        if (!text || isLoading) return
        setInput('')
        sendMessage(text)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className="container max-w-3xl mx-auto py-6 px-4 flex flex-col h-[calc(100vh-4rem)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Bot className="h-6 w-6 text-primary" />
                    <h1 className="text-xl font-bold">AI Hỗ Trợ Đặt Vé</h1>
                </div>
                {messages.length > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearChat}
                        className="text-muted-foreground"
                    >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Xóa hội thoại
                    </Button>
                )}
            </div>

            {/* Messages Area */}
            <Card className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
                    {messages.length === 0 ? (
                        <EmptyState />
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
                <div className="border-t p-4">
                    <div className="flex gap-2">
                        <Input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Nhập tin nhắn... (VD: Tìm chuyến xe từ Hà Nội đi Đà Nẵng)"
                            disabled={isLoading}
                            className="flex-1"
                        />
                        <Button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            size="icon"
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

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Xin chào! Tôi có thể giúp gì cho bạn?</p>
            <p className="text-sm mt-2">Bạn có thể hỏi tôi về:</p>
            <div className="mt-3 space-y-1 text-sm">
                <Suggestion text="Tìm chuyến xe từ Hà Nội đi Đà Nẵng ngày mai" />
                <Suggestion text="Kiểm tra vé BK-ABC123" />
                <Suggestion text="Chính sách hoàn vé như thế nào?" />
            </div>
        </div>
    )
}

function Suggestion({ text }: { text: string }) {
    const { sendMessage, isLoading } = useChatStore()

    return (
        <button
            onClick={() => !isLoading && sendMessage(text)}
            className="block w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors text-primary cursor-pointer"
        >
            &ldquo;{text}&rdquo;
        </button>
    )
}

function MessageBubble({ message }: { message: ChatMessage }) {
    const isUser = message.role === 'user'
    const isError = message.status === 'error'

    return (
        <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
            <div
                className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                    isUser
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : isError
                          ? 'bg-destructive/10 text-destructive border border-destructive/20 rounded-bl-md'
                          : 'bg-muted rounded-bl-md',
                )}
            >
                <div className="whitespace-pre-wrap wrap-break-word">{message.content}</div>

                {/* Workflow / tool info */}
                {message.workflowSlug && (
                    <div className="mt-1.5 text-xs opacity-60">
                        workflow: {message.workflowSlug}
                    </div>
                )}
                {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="mt-1.5 text-xs opacity-60">
                        🔧 {message.toolCalls.map((tc) => tc.tool_name).join(', ')}
                    </div>
                )}
            </div>
        </div>
    )
}

function TypingIndicator() {
    return (
        <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                    <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
            </div>
        </div>
    )
}
