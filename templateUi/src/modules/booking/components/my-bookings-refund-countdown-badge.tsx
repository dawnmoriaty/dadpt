import { Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { formatCountdown } from '../utils'

interface MyBookingsRefundCountdownBadgeProps {
    remainingMs: number
}

export function MyBookingsRefundCountdownBadge({ remainingMs }: MyBookingsRefundCountdownBadgeProps) {
    const { t } = useTranslation()

    if (remainingMs <= 0) {
        return <span className="text-xs text-muted-foreground">{t('myBookings.refundExpired')}</span>
    }

    return (
        <span className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 font-medium">
            <Clock className="h-3 w-3" />
            {t('myBookings.refundCountdown', { time: formatCountdown(remainingMs) })}
        </span>
    )
}
