import { createFileRoute } from '@tanstack/react-router'

import { LocationsPage } from '@/modules/location'

export const Route = createFileRoute('/admin/locations/')({
    component: LocationsPage,
})
