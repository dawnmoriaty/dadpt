import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import { initApiAuth } from '@/services/api/client'

interface User {
    id: number
    phone: string
    fullName: string
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
    setToken: (token: string) => void
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

                setToken: (token) =>
                    set({
                        token,
                    }, false, 'setToken'),

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
            }
        ),
        { name: 'AuthStore' }
    )
)

// Initialize API auth AFTER store is created
// Use getState() to always get the latest state, not a stale closure
initApiAuth(
    () => useAuthStore.getState().token,
    (token: string) => {
        // Use getState().setToken to ensure we're updating the current state
        useAuthStore.setState({ token }, false, 'setToken')
    },
    () => {
        // Clear auth and redirect
        useAuthStore.setState({
            token: null,
            user: null,
            isAuthenticated: false,
            isAdmin: false,
        }, false, 'clearAuth')
        window.location.href = '/login'
    }
)
