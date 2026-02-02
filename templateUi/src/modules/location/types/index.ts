// Location module types

export interface Location {
    id: number
    name: string
    city: string
    address: string
    keywords: string
}

export interface CreateLocationRequest {
    name: string
    city: string
    address?: string
    keywords?: string
}

export interface UpdateLocationRequest {
    name?: string
    city?: string
    address?: string
    keywords?: string
}
