import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import { useAuthStore } from '@/stores/use-auth-store'

import { authApi } from '../api'
import type { LoginRequest, RegisterRequest } from '../types'
import { canAccessAdmin } from '../types'

export const authKeys = {
    all: ['auth'] as const,
    user: () => [...authKeys.all, 'user'] as const,
}

export function useLogin(redirectTo?: string) {
    const setAuth = useAuthStore((state) => state.setAuth)
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (request: LoginRequest) => authApi.login(request),
        onSuccess: (data) => {
            setAuth(data.accessToken, data.user)
            void queryClient.invalidateQueries({ queryKey: authKeys.user() })
            const destination = redirectTo ?? (canAccessAdmin(data.user.role) ? '/admin/dashboard' : '/')
            navigate({ to: destination })
        },
    })
}

export function useRegister() {
    const setAuth = useAuthStore((state) => state.setAuth)
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (request: RegisterRequest) => authApi.register(request),
        onSuccess: (data) => {
            setAuth(data.accessToken, data.user)
            void queryClient.invalidateQueries({ queryKey: authKeys.user() })
            navigate({ to: '/' })
        },
    })
}

export function useLogout() {
    const logout = useAuthStore((state) => state.logout)
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: () => authApi.logout(),
        onSuccess: () => {
            queryClient.clear()
            logout()
        },
        onError: () => {
            queryClient.clear()
            logout()
        },
    })
}

export function getAuthState() {
    return useAuthStore.getState()
}
