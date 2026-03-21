import * as z from 'zod'

import { V } from '@/lib/validation/messages'

export const createBusTypeSchema = z.object({
    name: z.string().min(2, V.min('field.name', 2)).max(100, V.tooLong('field.name')),
    totalSeats: z.number().min(1, V.minNum('field.totalSeats', 1)).max(100, V.maxNum('field.totalSeats', 100)),
    seatLayout: z.record(z.string(), z.unknown()).optional().default({}),
})

export const updateBusTypeSchema = z.object({
    name: z.string().min(2, V.min('field.name', 2)).max(100, V.tooLong('field.name')),
    totalSeats: z.number().min(1, V.minNum('field.totalSeats', 1)).max(100, V.maxNum('field.totalSeats', 100)),
    seatLayout: z.record(z.string(), z.unknown()).optional(),
})

export type CreateBusTypeFormData = z.infer<typeof createBusTypeSchema>
export type UpdateBusTypeFormData = z.infer<typeof updateBusTypeSchema>
