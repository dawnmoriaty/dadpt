export type Role = 'admin' | 'operator' | 'customer'

export interface User {
    id: number
    phone?: string
    username?: string
    fullName: string
    email?: string
    role: Role
}

export interface LoginRequest {
    identifier: string
    password: string
}

export interface RegisterRequest {
    phone: string
    username: string
    password: string
    fullName: string
    email?: string
}

export interface AuthResponse {
    accessToken: string
    refreshToken?: string
    expiresIn: number
    user: User
}
