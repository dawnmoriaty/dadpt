// BusType module types

export interface BusType {
    id: number
    name: string
    totalSeats: number
    seatLayout: Record<string, unknown>
}

export interface CreateBusTypeRequest {
    name: string
    totalSeats: number
    seatLayout: Record<string, unknown>
}

export interface UpdateBusTypeRequest {
    name?: string
    totalSeats?: number
    seatLayout?: Record<string, unknown>
}

export interface BusTypeListParams {
    page?: number
    pageSize?: number
}
