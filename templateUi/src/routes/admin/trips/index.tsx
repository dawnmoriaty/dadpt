import { createFileRoute } from '@tanstack/react-router'

import { TripsPage } from '@/modules/trip'

export const Route = createFileRoute('/admin/trips/')({
    component: TripsPage,
})
