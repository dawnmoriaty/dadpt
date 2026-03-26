import { useQuery } from '@tanstack/react-query'

import { locationApi } from '../api'

export const LOCATION_QUERY_KEY = ['locations'] as const

export function useSearchLocations(query: string) {
    const normalizedQuery = query.trim()

    return useQuery({
        queryKey: [...LOCATION_QUERY_KEY, 'search', normalizedQuery],
        queryFn: () => locationApi.search({ q: normalizedQuery }),
        enabled: normalizedQuery.length >= 2,
    })
}
