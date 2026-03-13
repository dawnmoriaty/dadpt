import { z } from 'zod'

export const userSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Phone must be at least 10 digits'),
    password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
    role: z.enum(['admin', 'operator', 'customer']),
    isActive: z.boolean().default(true),
})

export type UserFormData = z.infer<typeof userSchema>
