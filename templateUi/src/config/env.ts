import { z } from 'zod'

const envSchema = z.object({
    VITE_API_BASE_URL: z.string().url().default('https://dadpt.vercel.app/api/v1'),
    VITE_APP_NAME: z.string().default('My App'),
    VITE_APP_VERSION: z.string().default('1.0.0'),
    VITE_ENABLE_UPCOMING_TRIPS: z
        .enum(['true', 'false'])
        .default('false')
        .transform((value) => value === 'true'),
})

function validateEnv() {
    try {
        return envSchema.parse(import.meta.env)
    } catch (error) {
        console.error('Invalid environment variables:', error)
        throw new Error('Invalid environment variables')
    }
}

export const env = validateEnv()
