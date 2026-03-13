import { useQuery } from '@tanstack/react-query'
import { tripApi } from '../api'
import type { SearchTripsRequest } from '../types'

export const TRIPS_QUERY_KEY = ['public-trips']

export function useSearchTrips(params: SearchTripsRequest, enabled: boolean = true) {
    return useQuery({
        queryKey: [...TRIPS_QUERY_KEY, 'search', params],
        queryFn: () => tripApi.search(params),
        enabled: enabled && !!params.origin && !!params.destination && !!params.departureDate,
    })
}

export function usePublicTrip(id: number) {
    return useQuery({
        queryKey: [...TRIPS_QUERY_KEY, id],
        queryFn: () => tripApi.getById(id),
        enabled: !!id,
    })
}
