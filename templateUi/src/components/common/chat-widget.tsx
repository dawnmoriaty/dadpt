import { MessageCircle, X } from 'lucide-react'

import { ChatPageWidget } from '@/modules/chat/components'
import { useChatWidgetStore } from '@/stores/use-chat-widget-store'

import { Button } from '../ui/button'

export function ChatWidget() {
    const { isOpen, open, close } = useChatWidgetStore()

    if (isOpen) {
        return <ChatPageWidget onClose={close} />
    }

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <Button
                type="button"
                onClick={open}
                className="h-12 rounded-full px-4 shadow-lg"
                aria-label="Mở AI hỗ trợ"
            >
                <MessageCircle className="mr-2 h-4 w-4" />
                AI hỗ trợ
                <X className="ml-2 h-3.5 w-3.5 opacity-0" />
            </Button>
        </div>
    )
}
