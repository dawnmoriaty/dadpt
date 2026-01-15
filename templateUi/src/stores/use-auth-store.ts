import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'

interface User {
    id: number
    phone: string
    username: string
    fullName: string
    email: string
    role: string
}

interface AuthState {
    token: string | null
    user: User | null
    isAuthenticated: boolean

    setAuth: (token: string, user: User) => void
    logout: () => void
    updateUser: (user: Partial<User>) => void

    // Actions are moved to services, store only holds state
}

export const useAuthStore = create<AuthState>()(
    devtools(
        persist(
            (set) => ({
                token: null,
                user: null,
                isAuthenticated: false,

                setAuth: (token, user) =>
                    set({ token, user, isAuthenticated: true }, false, 'setAuth'),

                logout: () => {
                    set({ token: null, user: null, isAuthenticated: false }, false, 'logout')
                    localStorage.removeItem('auth-storage')
                },

                updateUser: (userData) =>
                    set(
                        (state) => ({
                            user: state.user ? { ...state.user, ...userData } : null,
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
                }),
            }
        ),
        { name: 'AuthStore' }
    )
)
