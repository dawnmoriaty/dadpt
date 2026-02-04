import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'


import type { Role, User } from '@/modules/auth'
import { canAccessAdmin } from '@/modules/auth'
import { initApiAuth } from '@/services/api/client'

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
                        isAdmin: canAccessAdmin(user.role as Role),
                    }, false, 'setAuth'),

                setToken: (token) =>
                    set({ token }, false, 'setToken'),

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

initApiAuth(
    () => useAuthStore.getState().token,
    (token: string) => {
        useAuthStore.setState({ token }, false, 'setToken')
    },
    () => {
        useAuthStore.setState({
            token: null,
            user: null,
            isAuthenticated: false,
            isAdmin: false,
        }, false, 'clearAuth')
        window.location.href = '/login'
    }
)
