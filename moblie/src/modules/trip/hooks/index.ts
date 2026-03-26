import { useQuery } from '@tanstack/react-query'
import { tripApi } from '../api'
import type { SearchTripsRequest } from '../types'

export const TRIPS_QUERY_KEY = ['public-trips']

export function useSearchTrips(params: SearchTripsRequest, enabled: boolean = true) {
    return useQuery({
        queryKey: [...TRIPS_QUERY_KEY, 'search', params],
        queryFn: () => tripApi.search(params),
        enabled: enabled && params.originId > 0 && params.destinationId > 0 && !!params.departureDate,
    })
}

export function useBrowseTrips(params?: {
    providerIds?: number[]
    busTypeIds?: number[]
    page?: number
    limit?: number
}) {
    return useQuery({
        queryKey: [...TRIPS_QUERY_KEY, 'browse', params],
        queryFn: () => tripApi.browse(params),
    })
}

export function usePublicTrip(id: number) {
    return useQuery({
        queryKey: [...TRIPS_QUERY_KEY, id],
        queryFn: () => tripApi.getById(id),
        enabled: !!id,
    })
}
