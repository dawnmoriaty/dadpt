import { createFileRoute } from '@tanstack/react-router'

import { BusTypesPage } from '@/modules/bustype'

export const Route = createFileRoute('/admin/bus-types/')({
    component: BusTypesPage,
})
