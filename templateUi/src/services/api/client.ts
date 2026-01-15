import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1",
    timeout: 10000,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
})

// Request interceptor
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem("token")
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        console.log("API Request:", config.method?.toUpperCase(), config.url)
        return config
    },
    (error: AxiosError) => {
        console.error("Request error:", error)
        return Promise.reject(error)
    },
)

// Response interceptor
api.interceptors.response.use(
    (response: AxiosResponse) => {
        console.log("API Response:", response.status, response.config.url)
        return response
    },
    async (error: AxiosError) => {
        console.error("Response error:", error.response?.status, error.message)
        
        const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined

        // Handle 401 and prevent infinite loop
        if (originalRequest && error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true

            try {
                console.log("Attempting token refresh...")
                await api.post("/auth/refresh")
                console.log("Token refresh successful, retrying original request")
                return api(originalRequest)
            } catch (refreshError) {
                console.error("Token refresh failed:", refreshError)
                localStorage.removeItem("auth-storage")
                window.location.href = "/login"
                return Promise.reject(refreshError)
            }
        }
        return Promise.reject(error)
    },
)
