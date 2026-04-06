import { Link, useNavigate } from '@tanstack/react-router'
import { Mic, X } from 'lucide-react'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'

import { useChatStore } from '../hooks'
import { useChatInput } from '../hooks/use-chat-input'

import { ChatHeader } from './ChatHeader'
import { ChatMessages } from './ChatMessages'

export function ChatPage() {
    return <ChatPageWidget />
}

interface ChatPageWidgetProps {
    onClose?: () => void
}

export function ChatPageWidget({ onClose }: ChatPageWidgetProps) {
    const navigate = useNavigate()
    const { messages, isLoading, clearChat, sendMessage, loadNextPage } = useChatStore()
    const { input, setInput, send } = useChatInput()

    const handleClose = () => {
        if (onClose) {
            onClose()
            return
        }

        if (window.history.length > 1) {
            window.history.back()
            return
        }

        void navigate({ to: '/' })
    }

    useEffect(() => {
        const handler = (event: Event) => {
            const custom = event as CustomEvent<string>
            const value = typeof custom.detail === 'string' ? custom.detail.trim() : ''
            if (!value) {
                return
            }
            void sendMessage(value)
        }

        window.addEventListener('chat:quick-message', handler)
        return () => window.removeEventListener('chat:quick-message', handler)
    }, [sendMessage])

    return (
        <div className="fixed bottom-3 right-3 left-3 z-50 md:left-auto md:bottom-5 md:right-5 md:w-[min(540px,calc(100vw-2rem))]">
            <div className="rounded-2xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-background/85">
                <div className="max-h-[82vh] overflow-hidden rounded-2xl">
                    <div className="flex h-[min(80vh,760px)] flex-col gap-3 p-3 md:p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <ChatHeader canClear={messages.length > 0} onClear={clearChat} />

                            <div className="flex items-center gap-2 self-start">
                                <Button asChild size="sm" variant="outline" className="shrink-0 gap-1.5">
                                    <Link to="/voice-booking">
                                        <Mic className="h-3.5 w-3.5" />
                                        Voice
                                    </Link>
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={handleClose}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <ChatMessages
                            messages={messages}
                            isLoading={isLoading}
                            input={input}
                            onInputChange={setInput}
                            onSend={send}
                            sendMessage={sendMessage}
                            loadNextPage={loadNextPage}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
