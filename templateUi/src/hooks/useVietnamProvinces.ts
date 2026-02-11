import { useQuery } from '@tanstack/react-query'

import {
    vietnamProvincesApi,
    type Province,
    type District,
    type Ward,
} from '@/services/vietnam-provinces'

export const vietnamKeys = {
    provinces: ['vietnam', 'provinces'] as const,
    districts: (provinceCode: number) => ['vietnam', 'districts', provinceCode] as const,
    wards: (districtCode: number) => ['vietnam', 'wards', districtCode] as const,
}

export function useProvinces() {
    return useQuery<Province[]>({
        queryKey: vietnamKeys.provinces,
        queryFn: vietnamProvincesApi.getProvinces,
        staleTime: 24 * 60 * 60 * 1000, // Cache 24h — provinces don't change
        gcTime: 24 * 60 * 60 * 1000,
    })
}

export function useDistricts(provinceCode: number | null) {
    return useQuery<District[]>({
        queryKey: vietnamKeys.districts(provinceCode!),
        queryFn: () => vietnamProvincesApi.getDistricts(provinceCode!),
        enabled: !!provinceCode,
        staleTime: 24 * 60 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
    })
}

export function useWards(districtCode: number | null) {
    return useQuery<Ward[]>({
        queryKey: vietnamKeys.wards(districtCode!),
        queryFn: () => vietnamProvincesApi.getWards(districtCode!),
        enabled: !!districtCode,
        staleTime: 24 * 60 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
    })
}
