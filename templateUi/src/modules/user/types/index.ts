import type { Role } from '../../auth/types'

export interface User {
    id: number
    phone: string
    username: string
    fullName: string
    email: string
    role: Role
    isActive: boolean
    createdAt: string
    updatedAt: string
}

export interface CreateUserRequest {
    phone: string
    username: string
    password: string
    fullName: string
    email: string
    role: Role
    isActive?: boolean
}

export interface UpdateUserRequest {
    phone?: string
    username?: string
    password?: string
    fullName?: string
    email?: string
    role?: Role
    isActive?: boolean
}

export interface UserListResponse {
    items: User[]
    total: number
}
