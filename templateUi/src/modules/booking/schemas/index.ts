import * as z from 'zod'

import { V } from '@/lib/validation/messages'

const phoneRegex = /^(0|\+84)[0-9]{9,10}$/

export const guestInfoSchema = z.object({
    name: z.string().min(2, V.min('field.name', 2)).max(100, V.tooLong('field.name')),
    phone: z.string()
        .min(10, V.phoneMin)
        .regex(phoneRegex, V.phone),
    email: z.string().email(V.email).optional().or(z.literal('')),
})

export const pointInfoSchema = z.object({
    name: z.string().min(1, V.required('field.pointName')),
    time: z.string().optional(),
    surcharge: z.coerce.number().min(0).default(0),
})

export const createBookingSchema = z.object({
    tripId: z.coerce.number().min(1, V.required('entity.trip')),
    seatCodes: z.array(z.string()).min(1, V.required('field.seatNumbers')),
    guestInfo: guestInfoSchema,
    pickupInfo: pointInfoSchema,
    dropoffInfo: pointInfoSchema,
    paymentMethod: z.string().min(1, V.required('field.paymentMethod')),
})

export const searchTripsSchema = z.object({
    originId: z.coerce.number().min(1, V.required('field.origin')),
    destinationId: z.coerce.number().min(1, V.required('field.destination')),
    departureDate: z.string().min(1, V.required('field.departureTime')),
    passengers: z.coerce.number().min(1, V.minNum('field.seats', 1)).max(10, V.maxNum('field.seats', 10)).default(1),
})

export type CreateBookingFormData = z.infer<typeof createBookingSchema>
export type SearchTripsFormData = z.infer<typeof searchTripsSchema>
