import { Outlet } from '@tanstack/react-router'

import { ChatFab } from '@/components/common/chat-fab'
import { Header } from '@/components/common/header'

export function PublicLayout() {
    return (
        <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
                <Outlet />
            </main>
            <ChatFab />
        </div>
    )
}
