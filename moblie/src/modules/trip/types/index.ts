export interface Trip {
    id: number;
    providerName: string;
    originName: string;
    destinationName: string;
    departureTime: string;
    arrivalTime: string;
    basePrice: number;
    finalPrice: number;
    availableSeats: number;
    bookedSeats: string[];
    pickupPoints: PickupPoint[];
    dropoffPoints: DropoffPoint[];
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

export interface SearchTripsRequest {
    origin: string;
    destination: string;
    departureDate: string; // YYYY-MM-DD
}
