import { format } from 'date-fns'
import { ArrowRight, Calendar, Clock, Copy, MapPin, Ticket, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

import { useRefundCountdown } from '../hooks/use-refund-countdown'
import type { Booking } from '../types'
import { formatVndCurrency } from '../utils'

import { MyBookingsRefundCountdownBadge } from './my-bookings-refund-countdown-badge'
import { MyBookingsStatusBadge } from './my-bookings-status-badge'

interface MyBookingCardProps {
    booking: Booking
    onCancel: (id: number) => void
    onRefund: (id: number) => void
}

export function MyBookingCard({ booking, onCancel, onRefund }: MyBookingCardProps) {
    const [showConfirm, setShowConfirm] = useState(false)
    const { t } = useTranslation()
    const refundRemainingMs = useRefundCountdown(booking)

    const canCancel = booking.status === 'pending'
    const canRefund = booking.status === 'paid' && refundRemainingMs > 0
    const showAction = canCancel || canRefund
    const isRefund = canRefund && !canCancel

    function copyCode() {
        navigator.clipboard.writeText(booking.code)
        toast.success(t('myBookings.codeCopied'))
    }

    function handleConfirm() {
        if (isRefund) {
            onRefund(booking.id)
        } else {
            onCancel(booking.id)
        }
        setShowConfirm(false)
    }

    const confirmTitle = isRefund ? t('myBookings.refundBooking') : t('myBookings.cancelBooking')
    const confirmDescription = isRefund
        ? t('myBookings.refundConfirm', { code: booking.code, amount: formatVndCurrency(booking.totalAmount) })
        : t('myBookings.cancelConfirm', { code: booking.code })

    return (
        <>
            <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
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
                                <MyBookingsStatusBadge status={booking.status} />
                            </div>

                            {(booking.originName || booking.destinationName) && (
                                <div className="flex items-center gap-2 text-sm">
                                    <MapPin className="h-3.5 w-3.5 text-primary/60" />
                                    <span>{booking.originName ?? '—'}</span>
                                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>{booking.destinationName ?? '—'}</span>
                                </div>
                            )}

                            {booking.departureTime && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {format(new Date(booking.departureTime), 'dd/MM/yyyy HH:mm')}
                                </div>
                            )}

                            {booking.status === 'paid' && <MyBookingsRefundCountdownBadge remainingMs={refundRemainingMs} />}

                            {booking.status === 'refund_pending' && (
                                <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-full">
                                    <Clock className="h-3 w-3 animate-spin" style={{ animationDuration: '3s' }} />
                                    {t('myBookings.refundPendingMessage')}
                                </span>
                            )}

                            {booking.status === 'refunded' && (
                                <span className="inline-flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
                                    {t('myBookings.refundedMessage')}
                                </span>
                            )}

                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-muted-foreground">{t('myBookings.seats')}:</span>
                                {booking.seatCodes.map((seat) => (
                                    <Badge key={seat} variant="secondary" className="text-xs">
                                        {seat}
                                    </Badge>
                                ))}
                            </div>

                            <div className="text-sm text-muted-foreground">
                                <span>{booking.guestInfo.name}</span>
                                <span className="mx-1">•</span>
                                <span>{booking.guestInfo.phone}</span>
                            </div>
                        </div>

                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-3">
                            <div className="text-right">
                                <p className="text-2xl font-bold text-primary">{formatVndCurrency(booking.totalAmount)}</p>
                                <p className="text-xs text-muted-foreground capitalize">{booking.paymentMethod}</p>
                            </div>

                            {showAction && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={
                                        isRefund
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
