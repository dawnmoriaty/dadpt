// Shared pagination types used across modules

export interface PaginatedResponse<T> {
    total: number
    page: number
    items: T[]
    loadMoreAble: boolean
}

export interface PagingParams {
    page?: number
    pageSize?: number
}

export interface ApiResponse<T> {
    data: T
    message?: string
}

export interface ApiError {
    code: string
    message: string
}
