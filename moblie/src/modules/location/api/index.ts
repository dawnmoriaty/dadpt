import { api } from '@/src/services/api/client'

import type { Location, SearchLocationsParams } from '../types'

export const locationApi = {
    search: async (params: SearchLocationsParams): Promise<Location[]> => {
        const response = await api.get('/locations/search', { params })
        return response.data.data
    },
}
