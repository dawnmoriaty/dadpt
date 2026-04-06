import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, Save } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

import { useAdminBookingDetail, useAdminUpdateBookingStatus } from '../hooks'
import type { AdminUpdateBookingStatusRequest } from '../types'
import { formatVndCurrency } from '../utils'

import { MyBookingsStatusBadge } from './MyBookingsStatusBadge'

const editableStatuses: AdminUpdateBookingStatusRequest['status'][] = ['paid', 'cancelled', 'expired']

export function AdminBookingDetailPage() {
    const params = useParams({ from: '/admin/bookings/$bookingId' })
    const bookingId = Number(params.bookingId)
    const { data: booking, isLoading } = useAdminBookingDetail(bookingId)
    const updateStatusMutation = useAdminUpdateBookingStatus()
    const [nextStatus, setNextStatus] = useState<AdminUpdateBookingStatusRequest['status']>('paid')

    if (isLoading) {
        return <div className="text-sm text-muted-foreground">Đang tải chi tiết đơn đặt vé...</div>
    }

    if (typeof booking === 'undefined') {
        return <div className="text-sm text-muted-foreground">Không tìm thấy đơn đặt vé.</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Button asChild variant="ghost" size="sm">
                            <Link to="/admin/bookings">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Quay lại danh sách
                            </Link>
                        </Button>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">Chi tiết đơn đặt vé {booking.code}</h1>
                    <p className="text-muted-foreground">Theo dõi thông tin khách, ghế, thanh toán và cập nhật trạng thái thủ công.</p>
                </div>
                <MyBookingsStatusBadge status={booking.status} />
            </div>

            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                <Card>
                    <CardHeader>
                        <CardTitle>Thông tin đơn đặt vé</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <InfoItem label="Mã đơn đặt vé" value={booking.code} />
                        <InfoItem label="Mã đơn hàng" value={booking.orderCode ?? 'Chưa có'} />
                        <InfoItem label="Khách hàng" value={booking.guestInfo.name} />
                        <InfoItem label="Số điện thoại" value={booking.guestInfo.phone} />
                        <InfoItem label="Email" value={booking.guestInfo.email ?? 'Chưa có'} />
                        <InfoItem label="Phương thức thanh toán" value={booking.paymentMethod} />
                        <InfoItem label="Tuyến đường" value={`${booking.originName ?? 'Không rõ'} -> ${booking.destinationName ?? 'Không rõ'}`} />
                        <InfoItem label="Chuyến" value={`#${booking.tripId}`} />
                        <InfoItem label="Ghế" value={booking.seatCodes.join(', ')} />
                        <InfoItem label="Tổng tiền" value={formatVndCurrency(booking.totalAmount)} />
                        <InfoItem label="Điểm đón" value={booking.pickupInfo.name} />
                        <InfoItem label="Điểm trả" value={booking.dropoffInfo.name} />
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cập nhật trạng thái</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Select value={nextStatus} onValueChange={(value) => setNextStatus(value as AdminUpdateBookingStatusRequest['status'])}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                    {editableStatuses.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {status === 'paid'
                                                ? 'Đã thanh toán'
                                                : status === 'cancelled'
                                                  ? 'Đã hủy'
                                                  : 'Hết hạn'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                type="button"
                                className="w-full"
                                disabled={updateStatusMutation.isPending}
                                onClick={() => updateStatusMutation.mutate({ id: booking.id, data: { status: nextStatus } })}
                            >
                                <Save className="mr-2 h-4 w-4" />
                                Cập nhật trạng thái
                            </Button>
                            <p className="text-xs text-muted-foreground">
                                Hỗ trợ thao tác nhanh cho các trạng thái đã thanh toán, đã hủy và hết hạn.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Thông tin thêm</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Tạo lúc</span>
                                <span>{booking.createdAt}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Cập nhật lúc</span>
                                <span>{booking.updatedAt}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Hết hạn lúc</span>
                                <span>{booking.expiresAt || 'Không rõ'}</span>
                            </div>
                            {typeof booking.refundReference === 'string' && booking.refundReference.length > 0 ? (
                                <div className="rounded-lg border p-3">
                                    <p className="font-medium">Thông tin hoàn tiền</p>
                                    <p className="mt-2 text-muted-foreground">Mã hoàn: {booking.refundReference}</p>
                                    <p className="text-muted-foreground">Ghi chú: {booking.refundNote ?? 'Không rõ'}</p>
                                </div>
                            ) : null}
                            <div className="flex flex-wrap gap-2">
                                {booking.seatCodes.map((seatCode) => (
                                    <Badge key={seatCode} variant="outline">{seatCode}</Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 font-medium">{value}</p>
        </div>
    )
}
