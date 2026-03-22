import { ClipboardList } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent } from '@/components/ui/card'

export function AdminRefundRequestsEmpty() {
    const { t } = useTranslation()

    return (
        <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
                <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">{t('adminRefund.noRequests')}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('adminRefund.noRequestsHint')}</p>
            </CardContent>
        </Card>
    )
}
