import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'

import type { BookingStatus } from '../types'

interface MyBookingsStatusBadgeProps {
    status: BookingStatus
}

export function MyBookingsStatusBadge({ status }: MyBookingsStatusBadgeProps) {
    const { t } = useTranslation()

    const statusConfig: Record<BookingStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
        pending: { label: t('myBookings.status.pending'), variant: 'outline' },
        paid: { label: t('myBookings.status.paid'), variant: 'default' },
        cancelled: { label: t('myBookings.status.cancelled'), variant: 'destructive' },
        expired: { label: t('myBookings.status.expired'), variant: 'secondary' },
        refund_pending: { label: t('myBookings.status.refund_pending'), variant: 'outline' },
        refunded: { label: t('myBookings.status.refunded'), variant: 'secondary' },
    }

    const config = statusConfig[status] ?? { label: status, variant: 'secondary' as const }

    return <Badge variant={config.variant}>{config.label}</Badge>
}
