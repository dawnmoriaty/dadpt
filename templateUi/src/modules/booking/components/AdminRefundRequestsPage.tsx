import { format } from 'date-fns'
import { Check, ClipboardList, MapPin, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

import { useApproveRefund, useRefundRequests, useRefundSSE, useRejectRefund } from '../hooks'
import type { Booking } from '../types'

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(amount)
}

export function AdminRefundRequestsPage() {
    const { t } = useTranslation()
    const [page, setPage] = useState(1)
    const pageSize = 20

    const { data, isLoading } = useRefundRequests(page, pageSize)
    const approveMutation = useApproveRefund()
    const rejectMutation = useRejectRefund()

    // Connect to SSE for real-time refund notifications
    useRefundSSE()

    const [confirmAction, setConfirmAction] = useState<{
        type: 'approve' | 'reject'
        booking: Booking
    } | null>(null)

    function handleConfirm() {
        if (!confirmAction) return
        const { type, booking } = confirmAction
        if (type === 'approve') {
            approveMutation.mutate({ id: booking.id }, {
                onSettled: () => setConfirmAction(null),
            })
        } else {
            rejectMutation.mutate({ id: booking.id }, {
                onSettled: () => setConfirmAction(null),
            })
        }
    }

    const totalPages = data ? Math.ceil(data.total / pageSize) : 0

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="mt-2 h-4 w-48" />
                </div>
                <Skeleton className="h-96 w-full" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('adminRefund.title')}</h1>
                <p className="text-muted-foreground">{t('adminRefund.subtitle')}</p>
            </div>

            {/* Stats */}
            {data && data.total > 0 && (
                <Badge variant="secondary" className="text-sm">
                    {t('adminRefund.found', { count: data.total })}
                </Badge>
            )}

            {/* Empty State */}
            {(!data || data.items.length === 0) && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">{t('adminRefund.noRequests')}</p>
                        <p className="text-sm text-muted-foreground mt-1">{t('adminRefund.noRequestsHint')}</p>
                    </CardContent>
                </Card>
            )}

            {/* Table */}
            {data && data.items.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">{t('adminRefund.title')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('adminRefund.bookingCode')}</TableHead>
                                    <TableHead>{t('adminRefund.customer')}</TableHead>
                                    <TableHead>{t('adminRefund.route')}</TableHead>
                                    <TableHead>{t('adminRefund.seats')}</TableHead>
                                    <TableHead className="text-right">{t('adminRefund.amount')}</TableHead>
                                    <TableHead>{t('adminRefund.departure')}</TableHead>
                                    <TableHead>{t('adminRefund.requestedAt')}</TableHead>
                                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.items.map((booking) => (
                                    <RefundRequestRow
                                        key={booking.id}
                                        booking={booking}
                                        onApprove={() => setConfirmAction({ type: 'approve', booking })}
                                        onReject={() => setConfirmAction({ type: 'reject', booking })}
                                    />
                                ))}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-6">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => p - 1)}
                                >
                                    {t('common.previous')}
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    {t('common.page')} {page} / {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => p + 1)}
                                >
                                    {t('common.next')}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Confirm Dialog */}
            <ConfirmDialog
                open={confirmAction !== null}
                onOpenChange={(open) => { if (!open) setConfirmAction(null) }}
                title={confirmAction?.type === 'approve' ? t('adminRefund.approve') : t('adminRefund.reject')}
                description={
                    confirmAction?.type === 'approve'
                        ? t('adminRefund.approveConfirm', { code: confirmAction?.booking.code })
                        : t('adminRefund.rejectConfirm', { code: confirmAction?.booking.code })
                }
                confirmLabel={confirmAction?.type === 'approve' ? t('adminRefund.approve') : t('adminRefund.reject')}
                variant={confirmAction?.type === 'reject' ? 'destructive' : 'default'}
                onConfirm={handleConfirm}
                loading={approveMutation.isPending || rejectMutation.isPending}
            />
        </div>
    )
}

// ---------------------------------------------------------------------------
// Sub-component: single row
// ---------------------------------------------------------------------------

interface RefundRequestRowProps {
    booking: Booking
    onApprove: () => void
    onReject: () => void
}

function RefundRequestRow({ booking, onApprove, onReject }: RefundRequestRowProps) {
    const { t } = useTranslation()
    const routeLabel = booking.originName && booking.destinationName
        ? `${booking.originName} → ${booking.destinationName}`
        : '—'

    return (
        <TableRow>
            {/* Booking Code */}
            <TableCell className="font-mono font-medium">{booking.code}</TableCell>

            {/* Customer */}
            <TableCell>
                <div className="space-y-0.5">
                    <p className="text-sm font-medium">{booking.guestInfo.name}</p>
                    <p className="text-xs text-muted-foreground">{booking.guestInfo.phone}</p>
                </div>
            </TableCell>

            {/* Route */}
            <TableCell>
                <div className="flex items-center gap-1 text-sm">
                    <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate max-w-[200px]">{routeLabel}</span>
                </div>
            </TableCell>

            {/* Seats */}
            <TableCell>
                <div className="flex flex-wrap gap-1">
                    {booking.seatCodes.map((seat) => (
                        <Badge key={seat} variant="outline" className="text-xs">
                            {seat}
                        </Badge>
                    ))}
                </div>
            </TableCell>

            {/* Amount */}
            <TableCell className="text-right font-medium">
                {formatCurrency(booking.totalAmount)}
            </TableCell>

            {/* Departure */}
            <TableCell className="text-sm">
                {booking.departureTime
                    ? format(new Date(booking.departureTime), 'dd/MM/yyyy HH:mm')
                    : '—'}
            </TableCell>

            {/* Requested At (updatedAt is when status changed to refund_pending) */}
            <TableCell className="text-sm text-muted-foreground">
                {format(new Date(booking.updatedAt), 'dd/MM/yyyy HH:mm')}
            </TableCell>

            {/* Actions */}
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-300 hover:bg-green-50"
                        onClick={onApprove}
                    >
                        <Check className="h-4 w-4 mr-1" />
                        {t('adminRefund.approve')}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        onClick={onReject}
                    >
                        <X className="h-4 w-4 mr-1" />
                        {t('adminRefund.reject')}
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    )
}
