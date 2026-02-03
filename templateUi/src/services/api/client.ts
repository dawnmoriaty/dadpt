import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'

// Create axios instance
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1',
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

// Request interceptor - attach token from Zustand store
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = getToken?.()
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
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

interface RefreshResponse {
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

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
            // If already refreshing, queue this request
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject })
                }).then(() => api(originalRequest))
            }

            originalRequest._retry = true
            isRefreshing = true

            try {
                // Refresh token via HttpOnly cookie
                const { data } = await api.post<RefreshResponse>('/auth/refresh')
                
                // Update token in store
                if (data.accessToken && setToken) {
                    setToken(data.accessToken)
                    console.log('[Auth] Token refreshed successfully')
                }
                
                processQueue(null)
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
