import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import { initApiAuth } from '@/services/api/client'

interface User {
    id: number
    phone: string
    email?: string
    username?: string
    role: 'user' | 'admin' | 'operator' | 'customer'
}

interface AuthState {
    token: string | null
    user: User | null
    isAuthenticated: boolean
    isAdmin: boolean

    setAuth: (token: string, user: User) => void
    logout: () => void
    clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
    devtools(
        persist(
            (set) => ({
                token: null,
                user: null,
                isAuthenticated: false,
                isAdmin: false,

                setAuth: (token, user) =>
                    set({
                        token,
                        user,
                        isAuthenticated: true,
                        isAdmin: user.role === 'admin' || user.role === 'operator',
                    }, false, 'setAuth'),

                logout: () => {
                    localStorage.removeItem('token')
                    set({
                        token: null,
                        user: null,
                        isAuthenticated: false,
                        isAdmin: false,
                    }, false, 'logout')
                    window.location.href = '/login'
                },

                clearAuth: () => {
                    set({
                        token: null,
                        user: null,
                        isAuthenticated: false,
                        isAdmin: false,
                    }, false, 'clearAuth')
                    window.location.href = '/login'
                },
            }),
            {
                name: 'auth-storage',
                partialize: (state) => ({
                    token: state.token,
                    user: state.user,
                    isAuthenticated: state.isAuthenticated,
                    isAdmin: state.isAdmin,
                }),
                onRehydrateStorage: () => {
                    return (state) => {
                        // Initialize API auth after store rehydration
                        if (state) {
                            initApiAuth(
                                () => state.token,
                                () => state.clearAuth()
                            )
                        }
                    }
                },
            }
        ),
        { name: 'AuthStore' }
    )
)

// Initialize API auth on first load
initApiAuth(
    () => useAuthStore.getState().token,
    () => useAuthStore.getState().clearAuth()
)
