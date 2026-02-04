import { createFileRoute } from '@tanstack/react-router'

import { BusesPage } from '@/modules/bus'

export const Route = createFileRoute('/admin/buses/')({
    component: BusesPage,
})
