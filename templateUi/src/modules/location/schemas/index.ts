import * as z from 'zod'

import { V } from '@/lib/validation/messages'

export const createLocationSchema = z.object({
    name: z.string().min(2, V.min('field.name', 2)).max(200, V.tooLong('field.name')),
    city: z.string().min(2, V.required('field.city')).max(100, V.tooLong('field.city')),
    address: z.string().max(500, V.tooLong('field.address')).optional().or(z.literal('')),
    keywords: z.string().max(500, V.tooLong('Keywords')).optional().or(z.literal('')),
    imageUrl: z.string().optional().or(z.literal('')),
})

export const updateLocationSchema = createLocationSchema

export type CreateLocationFormData = z.infer<typeof createLocationSchema>
export type UpdateLocationFormData = z.infer<typeof updateLocationSchema>
