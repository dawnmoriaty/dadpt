import * as z from 'zod'

import { V } from '@/lib/validation/messages'

const licensePlateRegex = /^[0-9]{2}[A-Z]-[0-9]{3}\.[0-9]{2}$/

export const createBusSchema = z.object({
    providerId: z.coerce.number().min(1, V.required('field.provider')),
    busTypeId: z.coerce.number().min(1, V.required('field.busType')),
    licensePlate: z.string()
        .min(1, V.required('field.licensePlate'))
        .regex(licensePlateRegex, V.invalidFormat('field.licensePlate', '51B-123.45')),
    imageUrl: z.string().optional(),
})

export const updateBusSchema = z.object({
    busTypeId: z.coerce.number().min(1, V.required('field.busType')).optional(),
    licensePlate: z.string()
        .min(1, V.required('field.licensePlate'))
        .regex(licensePlateRegex, V.invalidFormat('field.licensePlate', '51B-123.45'))
        .optional(),
    status: z.enum(['active', 'maintenance', 'retired']).optional(),
    imageUrl: z.string().optional(),
})

export type CreateBusFormData = z.infer<typeof createBusSchema>
export type UpdateBusFormData = z.infer<typeof updateBusSchema>
