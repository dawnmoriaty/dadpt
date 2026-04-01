import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface ChatWidgetState {
    isOpen: boolean
    open: () => void
    close: () => void
    toggle: () => void
}

export const useChatWidgetStore = create<ChatWidgetState>()(
    devtools(
        persist(
            (set, get) => ({
                isOpen: false,
                open: () => set({ isOpen: true }, false, 'open'),
                close: () => set({ isOpen: false }, false, 'close'),
                toggle: () => set({ isOpen: !get().isOpen }, false, 'toggle'),
            }),
            {
                name: 'chat-widget-store',
                partialize: (state) => ({ isOpen: state.isOpen }),
            },
        ),
        { name: 'ChatWidgetStore' },
    ),
)
