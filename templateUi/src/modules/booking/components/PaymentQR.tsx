import { CheckCircle, Clock, XCircle } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

import { usePaymentStatus } from '../hooks'

interface PaymentQRProps {
    qrCode: string
    orderCode: string
    amount: number
    paymentUrl?: string
    expiresAt?: string
    onPaymentSuccess?: () => void
}

export function PaymentQR({ qrCode, orderCode, amount, paymentUrl, expiresAt, onPaymentSuccess }: PaymentQRProps) {
    const [timeLeft, setTimeLeft] = useState<number | null>(null)
    const isPending = timeLeft === null || timeLeft > 0
    const { data: paymentStatus } = usePaymentStatus(orderCode, isPending)

    // Countdown timer
    useEffect(() => {
        if (!expiresAt) return

        const updateTimer = () => {
            const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
            setTimeLeft(diff)
        }

        updateTimer()
        const interval = setInterval(updateTimer, 1000)
        return () => clearInterval(interval)
    }, [expiresAt])

    // Handle payment success
    useEffect(() => {
        if (paymentStatus?.status === 'success') {
            onPaymentSuccess?.()
        }
    }, [paymentStatus?.status, onPaymentSuccess])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const isExpired = timeLeft !== null && timeLeft <= 0
    const isSuccess = paymentStatus?.status === 'success'
    const isFailed = paymentStatus?.status === 'failed'

    return (
        <Card className="mx-auto w-full max-w-md">
            <CardHeader className="text-center">
                <CardTitle className="text-lg">Thanh toán chuyển khoản</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Status overlay */}
                {isSuccess && (
                    <div className="flex flex-col items-center gap-2 rounded-lg bg-green-50 p-4 dark:bg-green-950">
                        <CheckCircle className="h-12 w-12 text-green-500" />
                        <p className="text-lg font-semibold text-green-700 dark:text-green-300">Thanh toán thành công!</p>
                    </div>
                )}

                {isFailed && (
                    <div className="flex flex-col items-center gap-2 rounded-lg bg-red-50 p-4 dark:bg-red-950">
                        <XCircle className="h-12 w-12 text-red-500" />
                        <p className="text-lg font-semibold text-red-700 dark:text-red-300">Thanh toán thất bại</p>
                    </div>
                )}

                {isExpired && !isSuccess && !isFailed && (
                    <div className="flex flex-col items-center gap-2 rounded-lg bg-yellow-50 p-4 dark:bg-yellow-950">
                        <Clock className="h-12 w-12 text-yellow-500" />
                        <p className="text-lg font-semibold text-yellow-700 dark:text-yellow-300">Đã hết hạn thanh toán</p>
                    </div>
                )}

                {/* QR Code */}
                {!isSuccess && !isFailed && !isExpired && (
                    <>
                        <div className="flex justify-center">
                            <div className="rounded-xl border bg-white p-4">
                                <QRCodeSVG value={qrCode} size={240} level="M" />
                            </div>
                        </div>

                        {/* Payment info */}
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Số tiền:</span>
                                <span className="font-semibold text-primary">
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Mã đơn hàng:</span>
                                <span className="font-mono font-semibold">{orderCode}</span>
                            </div>
                        </div>

                        {/* Countdown */}
                        {timeLeft !== null && (
                            <div className={cn(
                                'text-center text-sm',
                                timeLeft < 60 ? 'text-red-500' : 'text-muted-foreground'
                            )}>
                                <Clock className="mr-1 inline-block h-4 w-4" />
                                Hết hạn sau: <span className="font-mono font-semibold">{formatTime(timeLeft)}</span>
                            </div>
                        )}

                        {/* Polling indicator */}
                        <p className="text-center text-xs text-muted-foreground">
                            Đang chờ xác nhận thanh toán...
                        </p>

                        {/* PayOS checkout redirect */}
                        {paymentUrl && (
                            <Button asChild className="w-full" variant="outline">
                                <a href={paymentUrl} target="_blank" rel="noopener noreferrer">
                                    Hoặc thanh toán qua trang PayOS
                                </a>
                            </Button>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    )
}
