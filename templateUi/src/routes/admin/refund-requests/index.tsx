import { createFileRoute } from '@tanstack/react-router'

import { RefundRequestsPage } from '@/modules/booking'

export const Route = createFileRoute('/admin/refund-requests/')({
    component: RefundRequestsPage,
})
