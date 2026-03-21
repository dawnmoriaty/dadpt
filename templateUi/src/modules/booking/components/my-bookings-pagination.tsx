import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

interface MyBookingsPaginationProps {
    page: number
    canGoPreviousPage: boolean
    canGoNextPage: boolean
    onPreviousPage: () => void
    onNextPage: () => void
}

export function MyBookingsPagination({
    page,
    canGoPreviousPage,
    canGoNextPage,
    onPreviousPage,
    onNextPage,
}: MyBookingsPaginationProps) {
    const { t } = useTranslation()

    return (
        <div className="flex justify-center gap-2 pt-4">
            <Button variant="outline" size="sm" disabled={!canGoPreviousPage} onClick={onPreviousPage}>
                {t('myBookings.previous')}
            </Button>
            <span className="flex items-center px-3 text-sm text-muted-foreground">{t('myBookings.page', { page })}</span>
            <Button variant="outline" size="sm" disabled={!canGoNextPage} onClick={onNextPage}>
                {t('myBookings.next')}
            </Button>
        </div>
    )
}
