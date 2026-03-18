import { createFileRoute } from '@tanstack/react-router'

import { AdminRefundRequestsPage } from '@/modules/booking'

export const Route = createFileRoute('/admin/refund-requests/')({
    component: AdminRefundRequestsPage,
})
