import { Outlet } from '@tanstack/react-router'

import { ChatWidget } from '@/components/common/chat-widget'
import { Header } from '@/components/common/header'

export function PublicLayout() {
    return (
        <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
                <Outlet />
            </main>
            <ChatWidget />
        </div>
    )
}
