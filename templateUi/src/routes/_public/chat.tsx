'use client'

import { createFileRoute } from '@tanstack/react-router'

import { ChatPage } from '@/modules/chat/components'

export const Route = createFileRoute('/_public/chat')({
    component: ChatPageWrapper,
})

function ChatPageWrapper() {
    return <ChatPage />
}
