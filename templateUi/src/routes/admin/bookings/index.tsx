import { createFileRoute } from '@tanstack/react-router'

import { AdminBookingsPage } from '@/modules/booking'

export const Route = createFileRoute('/admin/bookings/')({
    component: AdminBookingsPage,
})
