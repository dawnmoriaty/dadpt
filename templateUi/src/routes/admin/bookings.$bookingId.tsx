import { createFileRoute } from '@tanstack/react-router'

import { AdminBookingDetailPage } from '@/modules/booking'

export const Route = createFileRoute('/admin/bookings/$bookingId')({
    component: AdminBookingDetailPage,
})
