// User type matching backend response
export interface User {
    id: number
    phone: string
    username: string
    fullName: string
    email: string
    role: 'admin' | 'customer'
}

// Request DTOs
export interface LoginRequest {
    identifier: string
    password: string
}

export interface RegisterRequest {
    fullName: string
    username: string
    phone: string
    email?: string
    password: string
}

// Response DTOs
export interface AuthResponse {
    accessToken: string
    user: User
}

// Error type for API calls
export interface ApiError {
    response?: {
        data?: {
            message?: string
        }
    }
}
