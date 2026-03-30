import { Link } from '@tanstack/react-router'
import { Mic } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { useChatStore } from '../hooks'
import { useChatInput } from '../hooks/use-chat-input'

import { ChatHeader } from './ChatHeader'
import { ChatMessages } from './ChatMessages'

export function ChatPage() {
    const { messages, isLoading, clearChat, sendMessage } = useChatStore()
    const { input, setInput, send } = useChatInput()

    return (
        <div className="fixed bottom-5 right-5 z-50 w-[min(440px,calc(100vw-1.5rem))]">
            <div className="rounded-2xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-background/85">
                <div className="max-h-[82vh] overflow-hidden rounded-2xl">
                    <div className="flex h-[min(78vh,760px)] flex-col gap-4 p-4">
                        <div className="flex items-center justify-between gap-2">
                            <ChatHeader canClear={messages.length > 0} onClear={clearChat} />
                            <Button asChild size="sm" variant="outline" className="shrink-0 gap-1.5">
                                <Link to="/voice-booking">
                                    <Mic className="h-3.5 w-3.5" />
                                    Voice
                                </Link>
                            </Button>
                        </div>

                        <ChatMessages
                            messages={messages}
                            isLoading={isLoading}
                            input={input}
                            onInputChange={setInput}
                            onSend={send}
                            sendMessage={sendMessage}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
