import * as z from 'zod'

import { V } from '@/lib/validation/messages'

const pointSchema = z.object({
    name: z.string().min(1, V.required('field.pointName')),
    time: z.string().default(''),
    surcharge: z.coerce.number().min(0, V.gte('field.surcharge', 0)).default(0),
})

export const createTripSchema = z.object({
    providerId: z.coerce.number().min(1, V.required('field.provider')),
    busId: z.coerce.number().min(1, V.required('field.bus')),
    originId: z.coerce.number().min(1, V.required('field.origin')),
    destinationId: z.coerce.number().min(1, V.required('field.destination')),
    departureTime: z.string().min(1, V.required('field.departureTime')),
    arrivalTime: z.string().min(1, V.required('field.arrivalTime')),
    basePrice: z.coerce.number().min(0, V.gte('field.price', 0)),
    availableSeats: z.coerce.number().min(1, V.minNum('field.seats', 1)).max(100, V.maxNum('field.seats', 100)),
    pickupPoints: z.array(pointSchema).optional(),
    dropoffPoints: z.array(pointSchema).optional(),
})

export const updateTripSchema = z.object({
    departureTime: z.string().optional(),
    arrivalTime: z.string().optional(),
    basePrice: z.coerce.number().min(0, V.gte('field.price', 0)).optional(),
    isHotDeal: z.boolean().optional(),
    pickupPoints: z.array(pointSchema).optional(),
    dropoffPoints: z.array(pointSchema).optional(),
})

export type CreateTripFormData = z.infer<typeof createTripSchema>
export type UpdateTripFormData = z.infer<typeof updateTripSchema>
