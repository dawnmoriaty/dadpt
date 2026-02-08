import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { getApiErrorMessage } from '@/services/api/client'
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
    const { t } = useTranslation()

    return useMutation({
        mutationFn: (request: LoginRequest) => authApi.login(request),
        onSuccess: (data) => {
            setAuth(data.accessToken, data.user)
            void queryClient.invalidateQueries({ queryKey: authKeys.user() })
            toast.success(t('auth.loginSuccess'))
            const destination = redirectTo ?? (canAccessAdmin(data.user.role) ? '/admin/dashboard' : '/')
            navigate({ to: destination })
        },
        onError: (error: Error) => {
            toast.error(getApiErrorMessage(error, t('auth.loginError')))
        },
    })
}

export function useRegister() {
    const setAuth = useAuthStore((state) => state.setAuth)
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { t } = useTranslation()

    return useMutation({
        mutationFn: (request: RegisterRequest) => authApi.register(request),
        onSuccess: (data) => {
            setAuth(data.accessToken, data.user)
            void queryClient.invalidateQueries({ queryKey: authKeys.user() })
            toast.success(t('auth.registerSuccess'))
            navigate({ to: '/' })
        },
        onError: (error: Error) => {
            toast.error(getApiErrorMessage(error, t('auth.registerError')))
        },
    })
}

export function useLogout() {
    const logout = useAuthStore((state) => state.logout)
    const queryClient = useQueryClient()
    const { t } = useTranslation()

    return useMutation({
        mutationFn: () => authApi.logout(),
        onSuccess: () => {
            queryClient.clear()
            logout()
            toast.success(t('auth.logoutSuccess'))
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
