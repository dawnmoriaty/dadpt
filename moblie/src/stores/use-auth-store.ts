import { create } from 'zustand'

export interface User {
    id: number
    email: string
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

export const useAuthStore = create<AuthState>()((set) => ({
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
        }),
    logout: () =>
        set({
            token: null,
            user: null,
            isAuthenticated: false,
            isAdmin: false,
        }),
}))
