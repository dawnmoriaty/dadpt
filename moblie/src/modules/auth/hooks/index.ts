import { useMutation } from '@tanstack/react-query'

import { useAuthStore } from '@/src/stores/use-auth-store'

import { authApi } from '../api'
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types'

export function useLogin() {
    const setAuth = useAuthStore((state) => state.setAuth)

    return useMutation<AuthResponse, Error, LoginRequest>({
        mutationFn: (payload) => authApi.login(payload),
        onSuccess: (data) => {
            setAuth(data.accessToken, {
                id: data.user.id,
                email: data.user.email,
                phone: data.user.phone,
                username: data.user.username,
                fullName: data.user.fullName,
                role: data.user.role,
            })
        },
    })
}

export function useRegister() {
    const setAuth = useAuthStore((state) => state.setAuth)

    return useMutation<AuthResponse, Error, RegisterRequest>({
        mutationFn: (payload) => authApi.register(payload),
        onSuccess: (data) => {
            setAuth(data.accessToken, {
                id: data.user.id,
                email: data.user.email,
                phone: data.user.phone,
                username: data.user.username,
                fullName: data.user.fullName,
                role: data.user.role,
            })
        },
    })
}
