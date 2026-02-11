import { useNavigate } from '@tanstack/react-router'
import { CheckCircle, CreditCard, ExternalLink, Info, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { api } from '@/services/api/client'

import type { CreateBookingResponse } from '../types'

interface BookingSuccessProps {
    data: CreateBookingResponse
}

export function BookingSuccess({ data }: BookingSuccessProps) {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [isSimulating, setIsSimulating] = useState(false)
    const { booking, orderCode, paymentUrl } = data

    const handleSimulatePayment = async () => {
        setIsSimulating(true)
        try {
            await api.post('/bookings/payments/webhook', {
                orderCode,
                status: 'success',
            })
            toast.success(t('booking.paymentSimulated'))
        } catch (error) {
            console.error('Simulation failed:', error)
            toast.error(t('booking.simulationFailed'))
        } finally {
            setIsSimulating(false)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(amount)
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <Card className="border-green-200 bg-green-50/30">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
                    <h2 className="text-2xl font-bold text-green-800 mb-2">{t('booking.confirmed')}</h2>
                    <p className="text-green-700/80 mb-6 max-w-md">
                        {t('booking.confirmedHint')}
                    </p>
                    
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

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        {t('booking.paymentInstructions')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex justify-between items-center bg-muted/50 p-4 rounded-lg">
                        <span className="text-muted-foreground">{t('booking.totalAmount')}</span>
                        <span className="text-2xl font-bold text-primary">{formatCurrency(booking.totalAmount)}</span>
                    </div>

                    {paymentUrl && (
                        <div className="space-y-4">
                            <div className="flex gap-3 bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg">
                                <Info className="h-5 w-5 text-blue-600 shrink-0" />
                                <div>
                                    <h5 className="font-semibold">{t('booking.paymentRedirect')}</h5>
                                    <p className="text-sm opacity-90">{t('booking.paymentRedirectHint')}</p>
                                </div>
                            </div>
                            <Button className="w-full h-12 text-lg shadow-lg shadow-primary/20" asChild>
                                <a href={paymentUrl} target="_blank" rel="noopener noreferrer">
                                    {t('booking.payNow')}
                                    <ExternalLink className="ml-2 h-5 w-5" />
                                </a>
                            </Button>
                        </div>
                    )}

                    {!paymentUrl && booking.paymentMethod === 'bank_transfer' && (
                        <div className="p-4 border rounded-lg bg-orange-50/30 border-orange-200">
                            <h4 className="font-semibold text-orange-800 mb-2">{t('booking.bankTransfer')}</h4>
                            <p className="text-sm text-orange-700/80 mb-1">STK: 123456789 - MB Bank</p>
                            <p className="text-sm text-orange-700/80 mb-1">CTK: CONG TY VAN TAI DADPT</p>
                            <p className="text-sm font-medium text-orange-900 mt-2">
                                Nội dung: {booking.code}
                            </p>
                        </div>
                    )}

                    <div className="space-y-3 pt-2">
                        <p className="text-xs text-center text-muted-foreground italic">
                            {t('booking.devTestingOnly')}
                        </p>
                        <Button 
                            variant="outline" 
                            className="w-full border-dashed border-2 hover:bg-primary/5" 
                            onClick={handleSimulatePayment}
                            disabled={isSimulating}
                        >
                            {isSimulating ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <CreditCard className="mr-2 h-4 w-4" />
                            )}
                            {t('booking.simulatePaymentSuccess')}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Separator />

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
