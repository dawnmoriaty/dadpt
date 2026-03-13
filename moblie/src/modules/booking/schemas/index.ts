import { z } from 'zod'

export const createBookingSchema = z.object({
    tripId: z.number().min(1),
    seatCodes: z.array(z.string()).min(1, 'Vui lòng chọn ít nhất 1 chỗ'),
    guestInfo: z.object({
        name: z.string().min(2, 'Vui lòng nhập họ tên khách hàng'),
        phone: z.string().regex(/(84|0[3|5|7|8|9])+([0-9]{8})\b/g, 'Số điện thoại không hợp lệ'),
        email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
    }),
    pickupInfo: z.object({
        name: z.string().min(1, 'Vui lòng chọn điểm đón'),
        surcharge: z.number().default(0),
    }),
    dropoffInfo: z.object({
        name: z.string().min(1, 'Vui lòng chọn điểm trả'),
        surcharge: z.number().default(0),
    }),
    paymentMethod: z.string().min(1, 'Vui lòng chọn phương thức thanh toán'),
})

export type CreateBookingFormData = z.infer<typeof createBookingSchema>
