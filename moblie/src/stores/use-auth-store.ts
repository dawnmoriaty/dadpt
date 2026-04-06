import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface User {
    id: number
    email?: string
    phone?: string
    username?: string
    fullName: string
    role: string
}

interface AuthState {
    token: string | null
    user: User | null
    isAuthenticated: boolean
    isAdmin: boolean
    setAuth: (token: string, user: User) => void
    logout: () => void
}

export const useAuthStore = create<AuthState>()(
    devtools(
        (set) => ({
            token: null,
            user: null,
            isAuthenticated: false,
            isAdmin: false,
            setAuth: (token, user) =>
                set(
                    {
                        token,
                        user,
                        isAuthenticated: true,
                        isAdmin: user.role === 'admin' || user.role === 'operator',
                    },
                    false,
                    'setAuth',
                ),
            logout: () =>
                set(
                    {
                        token: null,
                        user: null,
                        isAuthenticated: false,
                        isAdmin: false,
                    },
                    false,
                    'logout',
                ),
        }),
        { name: 'MobileAuthStore' },
    ),
)
