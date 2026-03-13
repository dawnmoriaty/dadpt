import { useNavigate } from '@tanstack/react-router'
import { CheckCircle, Clock, CreditCard, ExternalLink } from 'lucide-react'
import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

import { usePaymentStatus } from '../hooks'
import type { CreateBookingResponse } from '../types'

import { PaymentQR } from './PaymentQR'

interface BookingSuccessProps {
    data: CreateBookingResponse
}

export function BookingSuccess({ data }: BookingSuccessProps) {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { booking, orderCode, paymentUrl, qrCode } = data

    const hasOnlinePayment = !!(paymentUrl || qrCode)

    // Derive isPaid from server state, not local state
    const needsPolling = hasOnlinePayment && booking.status !== 'paid'
    const { data: paymentStatus } = usePaymentStatus(orderCode, needsPolling)

    const isPaid = !hasOnlinePayment
        || booking.status === 'paid'
        || paymentStatus?.status === 'success'

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(amount)
    }

    // Toast once when payment succeeds (guard with ref to prevent duplicates)
    const toastShownRef = useRef(false)
    const handlePaymentSuccess = useCallback(() => {
        if (!toastShownRef.current) {
            toastShownRef.current = true
            toast.success('Thanh toán thành công! Vé của bạn đã được xác nhận.')
        }
    }, [])

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
                                {t('booking.orderCode')}
                            </p>
                            <p className="text-xl font-mono font-semibold text-muted-foreground tracking-wide">
                                {orderCode}
                            </p>
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
                            {t('booking.paymentInstructions')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Amount */}
                        <div className="flex justify-between items-center bg-muted/50 p-4 rounded-lg">
                            <span className="text-muted-foreground">{t('booking.totalAmount')}</span>
                            <span className="text-2xl font-bold text-primary">{formatCurrency(booking.totalAmount)}</span>
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
                                <a href={paymentUrl} target="_blank" rel="noopener noreferrer">
                                    {t('booking.payNow')}
                                    <ExternalLink className="ml-2 h-5 w-5" />
                                </a>
                            </Button>
                        )}

                        {/* COD - no online payment */}
                        {!hasOnlinePayment && booking.paymentMethod === 'cod' && (
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
