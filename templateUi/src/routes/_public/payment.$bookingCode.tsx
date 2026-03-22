import { createFileRoute, useParams, useSearch } from '@tanstack/react-router'

import { BookingSuccess } from '@/modules/booking'
import { useBookingByCode } from '@/modules/booking/hooks'

export const Route = createFileRoute('/_public/payment/$bookingCode')({
    component: PaymentResumePage,
    validateSearch: (search: Record<string, unknown>) => ({
        orderCode: typeof search.orderCode === 'string' ? search.orderCode : '',
    }),
})

function PaymentResumePage() {
    const { bookingCode } = useParams({ from: '/_public/payment/$bookingCode' })
    const { orderCode } = useSearch({ from: '/_public/payment/$bookingCode' })
    const { data, isLoading, isError } = useBookingByCode(bookingCode, orderCode)

    if (isLoading) {
        return <div className="container max-w-2xl mx-auto py-8 px-4">Đang tải thông tin thanh toán...</div>
    }

    if (isError || !data) {
        return <div className="container max-w-2xl mx-auto py-8 px-4">Không tìm thấy thông tin thanh toán cho mã vé này.</div>
    }

    return (
        <div className="container max-w-2xl mx-auto py-8 px-4">
            <BookingSuccess data={data} />
        </div>
    )
}
