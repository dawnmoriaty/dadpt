import { Ticket } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent } from '@/components/ui/card'

export function MyBookingsEmpty() {
    const { t } = useTranslation()

    return (
        <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Ticket className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-1">{t('myBookings.noBookings')}</h3>
                <p className="text-muted-foreground">{t('myBookings.noBookingsHint')}</p>
            </CardContent>
        </Card>
    )
}
