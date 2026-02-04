import * as z from 'zod'

const phoneRegex = /^(0|\+84)[0-9]{9,10}$/
const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/

export const loginSchema = z.object({
    identifier: z.string().min(3, 'Phone, email or username is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const registerSchema = z.object({
    phone: z.string()
        .min(10, 'Phone number must be at least 10 characters')
        .max(15, 'Phone number must be at most 15 characters')
        .regex(phoneRegex, 'Invalid Vietnamese phone number format'),
    username: z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username must be at most 30 characters')
        .regex(usernameRegex, 'Username can only contain letters, numbers and underscore'),
    fullName: z.string()
        .min(2, 'Full name must be at least 2 characters')
        .max(100, 'Full name must be at most 100 characters'),
    email: z.string().email('Invalid email format').optional().or(z.literal('')),
    password: z.string().min(6, 'Password must be at least 6 characters'),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
