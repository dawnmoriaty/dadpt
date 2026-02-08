import * as z from 'zod'

import { V } from '@/lib/validation/messages'

export const createProviderSchema = z.object({
    name: z.string().min(2, V.min('field.name', 2)).max(200, V.tooLong('field.name')),
    hotline: z.string().max(20, V.tooLong('field.hotline')).optional().or(z.literal('')),
    slug: z.string().max(100, V.tooLong('field.slug')).optional().or(z.literal('')),
    policyRefund: z.string().max(2000, V.tooLong('field.refundPolicy')).optional().or(z.literal('')),
    imageUrl: z.string().optional().or(z.literal('')),
})

export const updateProviderSchema = createProviderSchema.extend({
    isActive: z.boolean().optional(),
})

export type CreateProviderFormData = z.infer<typeof createProviderSchema>
export type UpdateProviderFormData = z.infer<typeof updateProviderSchema>
