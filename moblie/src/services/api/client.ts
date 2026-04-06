import axios from 'axios'
import { Platform } from 'react-native'

import { useAuthStore } from '@/src/stores/use-auth-store'

const localBaseUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8080/api/v1' : 'http://localhost:8080/api/v1'
const deployedBaseUrl = 'https://dadpt.vercel.app/api/v1'
const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim()
const BASE_URL = envBaseUrl && /^https?:\/\//.test(envBaseUrl)
    ? envBaseUrl.replace(/\/$/, '')
    : deployedBaseUrl

export const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
})

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

export const refreshApi = axios.create({
    baseURL: BASE_URL,
    timeout: 5000,
})
