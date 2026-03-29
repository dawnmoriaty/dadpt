import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { format } from 'date-fns'
import { CheckCircle, Clock, Copy, CreditCard, ExternalLink } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

import { usePaymentStatus } from '../hooks'
import { bookingKeys } from '../hooks/query-keys'
import type { CreateBookingResponse } from '../types'
import { formatVndCurrency } from '../utils'

import { PaymentQR } from './PaymentQR'

interface BookingSuccessProps {
    data: CreateBookingResponse
}

export function BookingSuccess({ data }: BookingSuccessProps) {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { booking, orderCode, paymentUrl, qrCode } = data

    const isCodBooking = booking.paymentMethod === 'cod'
    const requiresOnlinePayment = booking.paymentMethod === 'bank_transfer' || booking.paymentMethod === 'visa'
    const hasPaymentAccess = !!(paymentUrl || qrCode)

    // Derive isPaid from server state, not local state
    const needsPolling = requiresOnlinePayment && booking.status !== 'paid' && orderCode.length > 0
    const { data: paymentStatus } = usePaymentStatus(orderCode, needsPolling)

    useEffect(() => {
        if (paymentStatus?.status === 'success' || paymentStatus?.status === 'failed') {
            queryClient.invalidateQueries({ queryKey: bookingKeys.all })
        }
    }, [paymentStatus?.status, queryClient])

    const isPaid = booking.status === 'paid' || paymentStatus?.status === 'success'

    const formatDateTime = (value?: string) => {
        if (!value) return '—'
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return '—'
        return format(date, 'dd/MM/yyyy HH:mm')
    }

    const seatDisplay = booking.seatCodes?.length ? booking.seatCodes.join(', ') : '—'
    const passengerName = booking.guestInfo?.name || '—'
    const passengerPhone = booking.guestInfo?.phone || '—'
    const passengerEmail = booking.guestInfo?.email || '—'
    const routeDisplay = booking.originName || booking.destinationName
        ? `${booking.originName ?? '—'} → ${booking.destinationName ?? '—'}`
        : '—'

    // Toast once when payment succeeds (guard with ref to prevent duplicates)
    const toastShownRef = useRef(false)
    const handlePaymentSuccess = useCallback(() => {
        if (!toastShownRef.current) {
            toastShownRef.current = true
            toast.success('Thanh toán thành công! Vé của bạn đã được xác nhận.')
        }
    }, [])

    const copyOrderCode = async () => {
        if (!orderCode) {
            return
        }
        await navigator.clipboard.writeText(orderCode)
        toast.success('Đã copy mã giao dịch thanh toán')
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Booking Confirmed Banner */}
            <Card className={isPaid ? "border-green-200 bg-green-50/30" : "border-yellow-200 bg-yellow-50/30"}>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    {isPaid ? (
                        <>
                            <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
                            <h2 className="text-2xl font-bold text-green-800 mb-2">{t('booking.confirmed')}</h2>
                            <p className="text-green-700/80 mb-6 max-w-md">
                                {t('booking.confirmedHint')}
                            </p>
                        </>
                    ) : isCodBooking ? (
                        <>
                            <Clock className="h-16 w-16 text-blue-600 mb-4" />
                            <h2 className="text-2xl font-bold text-blue-800 mb-2">Đặt vé thành công</h2>
                            <p className="text-blue-700/80 mb-6 max-w-md">
                                Vé đã được giữ chỗ. Bạn sẽ thanh toán khi lên xe.
                            </p>
                        </>
                    ) : (
                        <>
                            <Clock className="h-16 w-16 text-yellow-600 mb-4" />
                            <h2 className="text-2xl font-bold text-yellow-800 mb-2">Chờ thanh toán</h2>
                            <p className="text-yellow-700/80 mb-6 max-w-md">
                                Vui lòng hoàn tất thanh toán ở bên dưới, hệ thống sẽ tự động xác nhận vé.
                            </p>
                        </>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
                        <div className="bg-white border border-green-100 rounded-xl p-4 shadow-sm">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                                {t('booking.bookingCode')}
                            </p>
                            <p className="text-2xl font-mono font-bold text-primary tracking-widest">
                                {booking.code}
                            </p>
                        </div>
                        <div className="bg-white border border-green-100 rounded-xl p-4 shadow-sm">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                                {isCodBooking ? 'Trạng thái thanh toán' : t('booking.orderCode')}
                            </p>
                            {isCodBooking ? (
                                <p className="text-lg font-semibold text-blue-700 tracking-wide">Thanh toán sau (COD)</p>
                            ) : (
                                <>
                                    <p className="text-xl font-mono font-semibold text-muted-foreground tracking-wide">
                                        {orderCode}
                                    </p>
                                    <Button type="button" variant="ghost" size="sm" className="mt-2 h-7 px-2" onClick={copyOrderCode}>
                                        <Copy className="mr-1 h-3.5 w-3.5" />
                                        Copy mã giao dịch
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Ticket Details */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{t('booking.ticketDetails')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">{t('field.fullName')}</p>
                            <p className="font-semibold">{passengerName}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">{t('field.phone')}</p>
                            <p className="font-semibold">{passengerPhone}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">{t('field.email')}</p>
                            <p className="font-semibold">{passengerEmail}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">{t('field.seatNumbers')}</p>
                            <p className="font-semibold">{seatDisplay}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">{t('booking.route')}</p>
                            <p className="font-semibold">{routeDisplay}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">{t('field.paymentMethod')}</p>
                            <p className="font-semibold">{booking.paymentMethod || '—'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">{t('field.departureTime')}</p>
                            <p className="font-semibold">{formatDateTime(booking.departureTime)}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">{t('field.arrivalTime')}</p>
                            <p className="font-semibold">{formatDateTime(booking.arrivalTime)}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">{t('booking.pickupPoint')}</p>
                            <p className="font-semibold">{booking.pickupInfo?.name || '—'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">{t('booking.dropoffPoint')}</p>
                            <p className="font-semibold">{booking.dropoffInfo?.name || '—'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">{t('booking.totalAmount')}</p>
                            <p className="font-semibold text-primary">{formatVndCurrency(booking.totalAmount)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Payment Section */}
            {!isPaid && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-primary" />
                            {isCodBooking ? 'Thông tin thanh toán' : t('booking.paymentInstructions')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex justify-between items-center bg-muted/50 p-4 rounded-lg">
                            <span className="text-muted-foreground">{t('booking.totalAmount')}</span>
                            <span className="text-2xl font-bold text-primary">{formatVndCurrency(booking.totalAmount)}</span>
                        </div>

                        {/* QR Code Payment (bank_transfer via PayOS) */}
                        {qrCode && (
                            <PaymentQR
                                qrCode={qrCode}
                                orderCode={orderCode}
                                amount={booking.totalAmount}
                                paymentUrl={paymentUrl}
                                expiresAt={booking.expiresAt}
                                onPaymentSuccess={handlePaymentSuccess}
                            />
                        )}

                        {/* Checkout URL only (no QR) */}
                        {paymentUrl && !qrCode && (
                            <Button className="w-full h-12 text-lg shadow-lg shadow-primary/20" asChild>
                                <a href={paymentUrl}>
                                    {t('booking.payNow')}
                                    <ExternalLink className="ml-2 h-5 w-5" />
                                </a>
                            </Button>
                        )}

                        {/* COD - no online payment */}
                        {!requiresOnlinePayment && booking.paymentMethod === 'cod' && (
                            <div className="flex gap-3 bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg">
                                <CreditCard className="h-5 w-5 text-blue-600 shrink-0" />
                                <div>
                                    <h5 className="font-semibold">Thanh toán khi lên xe</h5>
                                    <p className="text-sm opacity-90">
                                        Bạn sẽ thanh toán trực tiếp cho nhà xe khi lên xe. Vui lòng đến đúng giờ.
                                    </p>
                                </div>
                            </div>
                        )}

                        {requiresOnlinePayment && !hasPaymentAccess && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                Không tải được link thanh toán lúc này. Bạn có thể vào "Vé của tôi" và bấm "Tiếp tục thanh toán" để lấy lại link.
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <Separator />

            {/* Navigation */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2 pb-8">
                <Button variant="ghost" className="flex-1" onClick={() => navigate({ to: '/' })}>
                    {t('booking.backToHome')}
                </Button>
                <Button className="flex-1" onClick={() => navigate({ to: '/my-bookings' })}>
                    {t('booking.viewMyBookings')}
                </Button>
            </div>
        </div>
    )
}
