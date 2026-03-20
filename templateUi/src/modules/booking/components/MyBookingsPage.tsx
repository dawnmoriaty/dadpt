import { format } from 'date-fns';
import {
    ArrowRight,
    Calendar,
    Clock,
    Copy,
    MapPin,
    Ticket,
    Undo2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

import { useCancelBooking, useMyBookings } from '../hooks'
import type { Booking, BookingStatus } from '../types'

const REFUND_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(amount)
}

function getRefundRemainingMs(booking: Booking): number {
    if (booking.status !== 'paid') return 0
    // Use updatedAt because that's when the booking was marked as paid
    const paidAt = new Date(booking.updatedAt).getTime()
    const deadline = paidAt + REFUND_WINDOW_MS
    return Math.max(0, deadline - Date.now())
}

function formatCountdown(ms: number): string {
    const totalSeconds = Math.ceil(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function useRefundCountdown(booking: Booking) {
    const [remainingMs, setRemainingMs] = useState(() => getRefundRemainingMs(booking))

    useEffect(() => {
        if (booking.status !== 'paid') return
        const update = () => setRemainingMs(getRefundRemainingMs(booking))
        update()
        const interval = setInterval(update, 1000)
        return () => clearInterval(interval)
    }, [booking])

    return remainingMs
}

function BookingStatusBadge({ status }: { status: BookingStatus }) {
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

function RefundCountdownBadge({ remainingMs }: { remainingMs: number }) {
    const { t } = useTranslation()

    if (remainingMs <= 0) {
        return (
            <span className="text-xs text-muted-foreground">
                {t('myBookings.refundExpired')}
            </span>
        )
    }

    return (
        <span className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 font-medium">
            <Clock className="h-3 w-3" />
            {t('myBookings.refundCountdown', { time: formatCountdown(remainingMs) })}
        </span>
    )
}

function BookingCard({ booking, onCancel, onRefund }: {
    booking: Booking
    onCancel: (id: number) => void
    onRefund: (id: number) => void
}) {
    const [showConfirm, setShowConfirm] = useState(false)
    const { t } = useTranslation()
    const refundRemainingMs = useRefundCountdown(booking)

    const canCancel = booking.status === 'pending'
    const canRefund = booking.status === 'paid' && refundRemainingMs > 0
    const showAction = canCancel || canRefund

    const isRefund = canRefund && !canCancel

    const copyCode = () => {
        navigator.clipboard.writeText(booking.code)
        toast.success(t('myBookings.codeCopied'))
    }

    const handleConfirm = () => {
        if (isRefund) {
            onRefund(booking.id)
        } else {
            onCancel(booking.id)
        }
        setShowConfirm(false)
    }

    const confirmTitle = isRefund
        ? t('myBookings.refundBooking')
        : t('myBookings.cancelBooking')

    const confirmDescription = isRefund
        ? t('myBookings.refundConfirm', { code: booking.code, amount: formatCurrency(booking.totalAmount) })
        : t('myBookings.cancelConfirm', { code: booking.code })

    return (
        <>
            <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        {/* Left: Booking info */}
                        <div className="flex-1 space-y-3">
                            {/* Code & Status */}
                            <div className="flex items-center gap-3 flex-wrap">
                                <button
                                    onClick={copyCode}
                                    className="flex items-center gap-1.5 font-mono font-bold text-base hover:text-primary transition-colors"
                                    title={t('myBookings.clickToCopy')}
                                >
                                    <Ticket className="h-4 w-4" />
                                    {booking.code}
                                    <Copy className="h-3 w-3 text-muted-foreground" />
                                </button>
                                <BookingStatusBadge status={booking.status} />
                            </div>

                            {/* Route */}
                            {(booking.originName || booking.destinationName) && (
                                <div className="flex items-center gap-2 text-sm">
                                    <MapPin className="h-3.5 w-3.5 text-primary/60" />
                                    <span>{booking.originName ?? '—'}</span>
                                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>{booking.destinationName ?? '—'}</span>
                                </div>
                            )}

                            {/* Time */}
                            {booking.departureTime && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {format(new Date(booking.departureTime), 'dd/MM/yyyy HH:mm')}
                                </div>
                            )}

                            {/* Refund countdown for paid bookings */}
                            {booking.status === 'paid' && (
                                <RefundCountdownBadge remainingMs={refundRemainingMs} />
                            )}

                            {/* Refund pending message */}
                            {booking.status === 'refund_pending' && (
                                <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-full">
                                    <Clock className="h-3 w-3 animate-spin" style={{ animationDuration: '3s' }} />
                                    {t('myBookings.refundPendingMessage')}
                                </span>
                            )}

                            {/* Refunded message */}
                            {booking.status === 'refunded' && (
                                <span className="inline-flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
                                    {t('myBookings.refundedMessage')}
                                </span>
                            )}

                            {/* Seats */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-muted-foreground">{t('myBookings.seats')}:</span>
                                {booking.seatCodes.map((seat) => (
                                    <Badge key={seat} variant="secondary" className="text-xs">
                                        {seat}
                                    </Badge>
                                ))}
                            </div>

                            {/* Guest info */}
                            <div className="text-sm text-muted-foreground">
                                <span>{booking.guestInfo.name}</span>
                                <span className="mx-1">•</span>
                                <span>{booking.guestInfo.phone}</span>
                            </div>
                        </div>

                        {/* Right: Amount & Actions */}
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-3">
                            <div className="text-right">
                                <p className="text-2xl font-bold text-primary">
                                    {formatCurrency(booking.totalAmount)}
                                </p>
                                <p className="text-xs text-muted-foreground capitalize">
                                    {booking.paymentMethod}
                                </p>
                            </div>

                            {showAction && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={isRefund
                                        ? 'text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300'
                                        : 'text-destructive hover:text-destructive'
                                    }
                                    onClick={() => setShowConfirm(true)}
                                >
                                    {isRefund && <Undo2 className="mr-1.5 h-3.5 w-3.5" />}
                                    {isRefund ? t('myBookings.refundBooking') : t('myBookings.cancelBooking')}
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <ConfirmDialog
                open={showConfirm}
                onOpenChange={setShowConfirm}
                title={confirmTitle}
                description={confirmDescription}
                confirmLabel={confirmTitle}
                onConfirm={handleConfirm}
            />
        </>
    )
}

export function MyBookingsPage() {
    const [page, setPage] = useState(1)
    const { data, isLoading } = useMyBookings(page)
    const cancelBooking = useCancelBooking()
    const { t } = useTranslation()

    const bookings = data?.items ?? []
    const total = data?.total ?? 0

    return (
        <div className="container max-w-4xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">{t('myBookings.title')}</h1>
                    <p className="text-muted-foreground">
                        {total > 0 ? t('myBookings.found', { count: total }) : t('myBookings.noBookings')}
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="p-6">
                                <div className="h-20 bg-muted rounded" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : bookings.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <Ticket className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-semibold mb-1">{t('myBookings.noBookings')}</h3>
                        <p className="text-muted-foreground">
                            {t('myBookings.noBookingsHint')}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {bookings.map((booking: Booking) => (
                        <BookingCard
                            key={booking.id}
                            booking={booking}
                            onCancel={(id) => cancelBooking.mutate({ id, isRefund: false })}
                            onRefund={(id) => cancelBooking.mutate({ id, isRefund: true })}
                        />
                    ))}

                    {/* Pagination */}
                    {total > 20 && (
                        <div className="flex justify-center gap-2 pt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => p - 1)}
                            >
                                {t('myBookings.previous')}
                            </Button>
                            <span className="flex items-center px-3 text-sm text-muted-foreground">
                                {t('myBookings.page', { page })}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={bookings.length < 20}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                {t('myBookings.next')}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
