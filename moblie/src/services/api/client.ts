import axios from 'axios'
import { Platform } from 'react-native'

// Replace with your actual backend URL, note that localhost on physical devices or android emulator refers to the device itself.
// 10.0.2.2 is usually the alias to host loopback interface in Android Emulator.
const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8080/api/v1' : 'http://localhost:8080/api/v1'

export const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Add Auth store integration and interceptors here later if required
export const refreshApi = axios.create({
    baseURL: BASE_URL,
    timeout: 5000,
})
