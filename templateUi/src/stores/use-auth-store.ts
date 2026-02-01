import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import { authService } from '@/services/auth.service'
import type { User } from '@/types/auth.types'

interface AuthState {
    token: string | null
    user: User | null
    isAuthenticated: boolean
    isAdmin: boolean

    setAuth: (token: string, user: User) => void
    logout: () => Promise<void>
    updateUser: (user: Partial<User>) => void
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
                        isAdmin: user.role === 'admin',
                    }, false, 'setAuth'),

                logout: async () => {
                    try {
                        await authService.logout()
                    } catch (error) {
                        console.error('Logout API failed:', error)
                    }
                    localStorage.removeItem('token')
                    localStorage.removeItem('auth-storage')
                    set({
                        token: null,
                        user: null,
                        isAuthenticated: false,
                        isAdmin: false,
                    }, false, 'logout')
                },

                updateUser: (userData) =>
                    set(
                        (state) => ({
                            user: state.user ? { ...state.user, ...userData } : null,
                            isAdmin: userData.role ? userData.role === 'admin' : state.isAdmin,
                        }),
                        false,
                        'updateUser'
                    ),
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

