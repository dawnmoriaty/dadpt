import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'

import i18n from '@/lib/i18n'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'

// Create axios instance
export const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    withCredentials: true, // For HttpOnly cookies (refresh token)
    headers: {
        'Content-Type': 'application/json',
    },
})

// Separate axios instance for refresh token - NO interceptors attached
// This prevents infinite loops when refreshing
const refreshApi = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    withCredentials: true, // For HttpOnly cookies (refresh token)
    headers: {
        'Content-Type': 'application/json',
    },
})

// Token getter/setter - will be set by auth module
let getToken: (() => string | null) | null = null
let setToken: ((token: string) => void) | null = null
let onTokenExpired: (() => void) | null = null

/**
 * Initialize auth integration with API client
 * Called from auth module to avoid circular dependencies
 */
export const initApiAuth = (
    tokenGetter: () => string | null,
    tokenSetter: (token: string) => void,
    tokenExpiredCallback: () => void
) => {
    getToken = tokenGetter
    setToken = tokenSetter
    onTokenExpired = tokenExpiredCallback
}

// Request interceptor - attach token and Accept-Language
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = getToken?.()
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        // Send current UI language so backend returns localized error messages
        config.headers['Accept-Language'] = i18n.language || 'vi'
        return config
    },
    (error: AxiosError) => {
        return Promise.reject(error)
    }
)

// Response interceptor - handle 401 and token refresh
interface FailedRequest {
    resolve: (value: AxiosResponse | Promise<AxiosResponse>) => void
    reject: (reason: AxiosError) => void
}

// Backend response wrapper
interface ApiResponse<T> {
    code: number
    status: string
    message: string
    data: T
}

interface RefreshData {
    accessToken: string
    refreshToken?: string
    user?: {
        id: number
        phone: string
        email?: string
        username?: string
        role: string
    }
}

let isRefreshing = false
let failedQueue: FailedRequest[] = []

const processQueue = (error: AxiosError | null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error)
        } else {
            prom.resolve(null as unknown as AxiosResponse)
        }
    })
    failedQueue = []
}


api.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

        console.log('[Auth Debug] Response error:', error.response?.status, error.config?.url)
        console.log('[Auth Debug] _retry:', originalRequest._retry, 'isRefreshing:', isRefreshing)

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
            console.log('[Auth Debug] Got 401, attempting refresh...')
            
            // Skip refresh for auth endpoints to avoid loops
            if (originalRequest.url?.includes('/auth/refresh')) {
                console.log('[Auth Debug] Skip refresh for refresh endpoint')
                return Promise.reject(error)
            }

            // If already refreshing, queue this request
            if (isRefreshing) {
                console.log('[Auth Debug] Already refreshing, queuing request')
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject })
                }).then(() => api(originalRequest))
            }

            originalRequest._retry = true
            isRefreshing = true

            try {
                console.log('[Auth Debug] Calling refresh endpoint...')
                // Use separate axios instance WITHOUT interceptors to avoid infinite loop
                // refresh_token is sent via HttpOnly cookie (withCredentials: true)
                const { data } = await refreshApi.post<ApiResponse<RefreshData>>('/auth/refresh')
                
                console.log('[Auth Debug] Refresh response:', data)
                
                // Backend returns: { code, status, message, data: { accessToken, ... } }
                // So accessToken is in data.data
                const accessToken = data.data?.accessToken
                
                if (accessToken && setToken) {
                    setToken(accessToken)
                    console.log('[Auth] Token refreshed successfully, new token:', accessToken.substring(0, 20) + '...')
                } else {
                    console.error('[Auth] No accessToken in refresh response')
                }
                
                processQueue(null)
                
                // Update the original request with new token
                originalRequest.headers.Authorization = `Bearer ${accessToken}`
                return api(originalRequest)
            } catch (refreshError) {
                console.error('[Auth] Token refresh failed:', refreshError)
                processQueue(refreshError as AxiosError)
                // Notify auth store to clear state and redirect to login
                onTokenExpired?.()
                return Promise.reject(refreshError)
            } finally {
                isRefreshing = false
            }
        }

        return Promise.reject(error)
    }
)

// ---------------------------------------------------------------------------
// Error extraction helper
// ---------------------------------------------------------------------------

/**
 * Extracts a user-facing error message from an API error.
 * The backend already returns a localised `message` via the i18n system,
 * so we prefer that.  Falls back to `fallback` or a generic i18n key.
 */
export function getApiErrorMessage(error: unknown, fallback?: string): string {
    if (axios.isAxiosError(error)) {
        const msg = (error.response?.data as Record<string, unknown>)?.message
        if (typeof msg === 'string' && msg.length > 0) return msg
    }
    return fallback ?? i18n.t('common.error')
}
