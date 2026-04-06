import { z } from 'zod'

const phoneRegex = /^(0|\+84)[0-9]{9,10}$/
const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/

export const loginSchema = z.object({
    identifier: z.string().min(3, 'Vui long nhap so dien thoai/email/username'),
    password: z.string().min(6, 'Mat khau toi thieu 6 ky tu'),
})

export const registerSchema = z.object({
    phone: z.string().regex(phoneRegex, 'So dien thoai khong hop le'),
    username: z.string().regex(usernameRegex, 'Username chi gom chu, so va dau gach duoi'),
    fullName: z.string().min(2, 'Ho ten toi thieu 2 ky tu').max(100, 'Ho ten toi da 100 ky tu'),
    email: z.string().email('Email khong hop le').optional().or(z.literal('')),
    password: z.string().min(6, 'Mat khau toi thieu 6 ky tu'),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
