// src/modules/shared/types/index.ts

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

export interface ApiError {
    code: string
    message: string
}
