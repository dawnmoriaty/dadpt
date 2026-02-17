import * as z from 'zod'

import { V } from '@/lib/validation/messages'

const phoneRegex = /^(0|\+84)[0-9]{9,10}$/
const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/

export const loginSchema = z.object({
    identifier: z.string().min(3, V.required('Phone, email or username')),
    password: z.string().min(6, V.min('field.password', 6)),
})

export const registerSchema = z.object({
    phone: z.string()   
        .min(10, V.min('field.phone', 10))
        .max(15, V.max('field.phone', 15))
        .regex(phoneRegex, V.phone),
    username: z.string()
        .min(3, V.min('field.username', 3))
        .max(30, V.max('field.username', 30))
        .regex(usernameRegex, 'Tên đăng nhập chỉ chứa chữ cái, số và dấu gạch dưới'),
    fullName: z.string()
        .min(2, V.min('field.name', 2))
        .max(100, V.max('field.name', 100)),
    email: z.string().email(V.email).optional().or(z.literal('')),
    password: z.string().min(6, V.min('field.password', 6)),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
