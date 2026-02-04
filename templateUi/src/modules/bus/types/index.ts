// Bus module types

export type BusStatus = 'active' | 'maintenance' | 'retired'

export interface Bus {
    id: number
    providerId: number
    busTypeId: number
    licensePlate: string
    status: BusStatus
    imageUrl?: string
    busTypeName?: string
    totalSeats?: number
    providerName?: string
}

export interface CreateBusRequest {
    providerId: number
    busTypeId: number
    licensePlate: string
    imageUrl?: string
}

export interface UpdateBusRequest {
    busTypeId?: number
    licensePlate?: string
    status?: BusStatus
    imageUrl?: string
}

export interface BusListParams {
    page?: number
    pageSize?: number
    providerId?: number
}
