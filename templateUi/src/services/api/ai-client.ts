import axios from 'axios'

const AI_BASE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8100'

export const aiApi = axios.create({
    baseURL: AI_BASE_URL,
    timeout: 120_000,
    headers: {
        'Content-Type': 'application/json',
    },
})

export const aiChatApi = {
    health: async () => {
        const { data } = await aiApi.get('/health')
        return data
    },
}
