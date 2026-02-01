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

interface FailedRequest {
    resolve: (value: AxiosResponse | Promise<AxiosResponse>) => void
    reject: (reason: AxiosError) => void
}

let isRefreshing = false
let failedQueue: FailedRequest[] = []

const processQueue = (error: AxiosError | null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error)
        } else {
            prom.resolve(null as unknown as AxiosResponse) // We just need to trigger the retry
        }
    })
    failedQueue = []
}

api.interceptors.response.use(
    (response: AxiosResponse) => {
        console.log("API Response:", response.status, response.config.url)
        return response
    },
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject })
                })
                    .then(() => {
                        return api(originalRequest)
                    })
                    .catch((err) => {
                        return Promise.reject(err)
                    })
            }

            originalRequest._retry = true
            isRefreshing = true

            try {
                console.log("Attempting token refresh...")
                await api.post("/auth/refresh")
                console.log("Token refresh successful, retrying original request")
                
                processQueue(null)
                return api(originalRequest)
            } catch (refreshError) {
                console.error("Token refresh failed:", refreshError)
                processQueue(refreshError as AxiosError)
                
                localStorage.removeItem("auth-storage")
                window.location.href = "/login"
                return Promise.reject(refreshError)
            } finally {
                isRefreshing = false
            }
        }

        return Promise.reject(error)
    },
)
