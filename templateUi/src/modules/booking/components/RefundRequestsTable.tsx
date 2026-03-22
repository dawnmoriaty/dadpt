import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

import type { Booking } from '../types'

import { RefundRequestRow } from './RefundRequestRow'

interface RefundRequestsTableProps {
    bookings: Booking[]
    title: string
    page: number
    totalPages: number
    canGoPreviousPage: boolean
    canGoNextPage: boolean
    onPreviousPage: () => void
    onNextPage: () => void
    onApprove: (booking: Booking) => void
    onReject: (booking: Booking) => void
}

export function RefundRequestsTable({
    bookings,
    title,
    page,
    totalPages,
    canGoPreviousPage,
    canGoNextPage,
    onPreviousPage,
    onNextPage,
    onApprove,
    onReject,
}: RefundRequestsTableProps) {
    const { t } = useTranslation()

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('refundRequests.bookingCode')}</TableHead>
                            <TableHead>{t('refundRequests.customer')}</TableHead>
                            <TableHead>{t('refundRequests.route')}</TableHead>
                            <TableHead>{t('refundRequests.seats')}</TableHead>
                            <TableHead className="text-right">{t('refundRequests.amount')}</TableHead>
                            <TableHead>{t('refundRequests.departure')}</TableHead>
                            <TableHead>{t('refundRequests.requestedAt')}</TableHead>
                            <TableHead className="text-right">{t('common.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {bookings.map((booking) => (
                            <RefundRequestRow
                                key={booking.id}
                                booking={booking}
                                onApprove={() => onApprove(booking)}
                                onReject={() => onReject(booking)}
                            />
                        ))}
                    </TableBody>
                </Table>

                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                        <Button variant="outline" size="sm" disabled={!canGoPreviousPage} onClick={onPreviousPage}>
                            {t('common.previous')}
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            {t('common.page')} {page} / {totalPages}
                        </span>
                        <Button variant="outline" size="sm" disabled={!canGoNextPage} onClick={onNextPage}>
                            {t('common.next')}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
