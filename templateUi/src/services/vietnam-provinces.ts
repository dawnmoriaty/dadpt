import axios from 'axios'

const vietnamApi = axios.create({
    baseURL: 'https://provinces.open-api.vn/api',
    timeout: 10000,
})

export interface Province {
    code: number
    name: string
    division_type: string
    codename: string
    phone_code: number
}

export interface District {
    code: number
    name: string
    division_type: string
    codename: string
    province_code: number
}

export interface Ward {
    code: number
    name: string
    division_type: string
    codename: string
    district_code: number
}

interface ProvinceWithDistricts extends Province {
    districts: District[]
}

interface DistrictWithWards extends District {
    wards: Ward[]
}

export const vietnamProvincesApi = {
    /** Get all 63 provinces/cities */
    getProvinces: async (): Promise<Province[]> => {
        const { data } = await vietnamApi.get<Province[]>('/p/')
        return data
    },

    /** Get districts of a province */
    getDistricts: async (provinceCode: number): Promise<District[]> => {
        const { data } = await vietnamApi.get<ProvinceWithDistricts>(`/p/${provinceCode}?depth=2`)
        return data.districts
    },

    /** Get wards of a district */
    getWards: async (districtCode: number): Promise<Ward[]> => {
        const { data } = await vietnamApi.get<DistrictWithWards>(`/d/${districtCode}?depth=2`)
        return data.wards
    },
}
