export interface Location {
    id: number
    name: string
    city: string
    address?: string
    keywords?: string
}

export interface SearchLocationsParams {
    q: string
}
