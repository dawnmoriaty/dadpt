export interface Trip {
    id: number;
    providerId?: number;
    busId?: number;
    originId?: number;
    destinationId?: number;
    providerName: string;
    busTypeName?: string;
    originName: string;
    originCity?: string;
    destinationName: string;
    destinationCity?: string;
    departureTime: string;
    arrivalTime: string;
    basePrice: number;
    finalPrice: number;
    availableSeats: number;
    isHotDeal?: boolean;
    status?: 'scheduled' | 'departed' | 'completed' | 'cancelled';
    bookedSeats: string[];
    busImageUrl?: string | null;
    pickupPoints: PickupPoint[];
    dropoffPoints: DropoffPoint[];
    seatLayout?: SeatLayout | null;
}

export interface PickupPoint {
    name: string;
    time: string;
    surcharge: number;
}

export interface DropoffPoint {
    name: string;
    time: string;
    surcharge: number;
}

export interface SeatLayout {
    type: 'seater' | 'sleeper' | 'limousine' | 'limousine_cabin'
    rows: number
    floors?: number
    columns: string[]
    seats: string[]
}

export interface SearchTripsRequest {
    originId: number
    destinationId: number
    departureDate: string
    minSeats?: number
}
