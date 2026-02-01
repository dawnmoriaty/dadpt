import { createFileRoute } from '@tanstack/react-router'

import { PublicLayout } from '@/components/layout'

export const Route = createFileRoute('/_public')({
    component: PublicLayout,
})
