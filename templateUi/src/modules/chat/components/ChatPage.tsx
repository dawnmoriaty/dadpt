import { VoiceBookingPanel } from '@/modules/voice'

import { useChatStore } from '../hooks'
import { useChatInput } from '../hooks/use-chat-input'

import { ChatHeader } from './ChatHeader'
import { ChatMessages } from './ChatMessages'

export function ChatPage() {
    const { messages, isLoading, clearChat, sendMessage } = useChatStore()
    const { input, setInput, send } = useChatInput()

    return (
        <div className="container mx-auto flex h-[calc(100vh-6rem)] max-w-4xl flex-col gap-6 px-4 py-6">
            <ChatHeader canClear={messages.length > 0} onClear={clearChat} />
            <VoiceBookingPanel disabled={isLoading} />
            <ChatMessages
                messages={messages}
                isLoading={isLoading}
                input={input}
                onInputChange={setInput}
                onSend={send}
                sendMessage={sendMessage}
            />
        </div>
    )
}
