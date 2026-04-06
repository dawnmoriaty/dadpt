import { api } from '@/src/services/api/client'

import type { AuthResponse, LoginRequest, RegisterRequest } from '../types'

interface ApiResponse<T> {
    data: T
}

export const authApi = {
    login: async (request: LoginRequest): Promise<AuthResponse> => {
        const { data } = await api.post<ApiResponse<AuthResponse>>('/auth/login', request)
        return data.data
    },

    register: async (request: RegisterRequest): Promise<AuthResponse> => {
        const { data } = await api.post<ApiResponse<AuthResponse>>('/auth/register', request)
        return data.data
    },
}
