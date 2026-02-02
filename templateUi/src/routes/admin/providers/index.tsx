import { createFileRoute } from '@tanstack/react-router'

import { ProvidersPage } from '@/modules/provider'

export const Route = createFileRoute('/admin/providers/')({
    component: ProvidersPage,
})
