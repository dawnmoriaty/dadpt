import { createFileRoute } from '@tanstack/react-router'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatVndCurrency, useAdminBookingStats, useAdminBookings, useAdminRevenueSeries } from '@/modules/booking'

export const Route = createFileRoute('/admin/dashboard')({
    component: DashboardPage,
})

function DashboardPage() {
    const { data: stats } = useAdminBookingStats()
    const { data: recentBookings } = useAdminBookings({ page: 1, pageSize: 5 })
    const { data: revenueSeries } = useAdminRevenueSeries(7)
    const maxRevenue = revenueSeries?.items.reduce((max, item) => Math.max(max, item.paidRevenue), 0) ?? 0

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Tổng quan</h1>
                <p className="text-muted-foreground">Số liệu đơn đặt vé và doanh thu cập nhật từ dữ liệu thực tế.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { title: 'Tổng đơn đặt vé', value: stats?.totalBookings ?? 0, icon: '🎫', color: 'bg-blue-500', note: 'Tất cả đơn đặt vé đã tạo' },
                    { title: 'Doanh thu đã thu', value: formatVndCurrency(stats?.paidRevenue ?? 0), icon: '💰', color: 'bg-green-500', note: 'Chỉ tính vé đã thanh toán' },
                    { title: 'Vé chưa thanh toán', value: stats?.unpaidBookings ?? 0, icon: '⏳', color: 'bg-yellow-500', note: 'Bao gồm vé COD và chờ xử lý' },
                    { title: 'Chuyến có đặt vé', value: stats?.activeTripCount ?? 0, icon: '🚌', color: 'bg-purple-500', note: 'Chuyến đang có khách' },
                ].map((stat) => (
                    <div key={stat.title} className="bg-background rounded-xl shadow-sm p-6 border">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">{stat.title}</p>
                                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                                <p className="text-xs mt-1 text-muted-foreground">{stat.note}</p>
                            </div>
                            <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-2xl`}>
                                {stat.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Dòng tiền đặt vé</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Doanh thu đã thu</span>
                            <span className="font-semibold">{formatVndCurrency(stats?.paidRevenue ?? 0)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Doanh thu chờ thu</span>
                            <span className="font-semibold">{formatVndCurrency(stats?.unpaidRevenue ?? 0)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Đơn chờ duyệt hoàn</span>
                            <span className="font-semibold">{stats?.refundPendingBookings ?? 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Đơn đã hủy</span>
                            <span className="font-semibold">{stats?.cancelledBookings ?? 0}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Doanh thu 7 ngày gần nhất</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {(revenueSeries?.items ?? []).map((item) => {
                            const filledBlocks = maxRevenue > 0 ? Math.max(1, Math.round((item.paidRevenue / maxRevenue) * 12)) : 1

                            return (
                                <div key={item.date} className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{item.date}</span>
                                        <span>{formatVndCurrency(item.paidRevenue)}</span>
                                    </div>
                                    <div className="grid grid-cols-12 gap-1">
                                        {Array.from({ length: 12 }, (_, index) => (
                                            <div
                                                key={`${item.date}-${index}`}
                                                className={index < filledBlocks ? 'h-2 rounded-full bg-primary' : 'h-2 rounded-full bg-muted'}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{item.totalBookings} đơn</span>
                                        <span>{item.paidBookings} đã thanh toán</span>
                                    </div>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Đặt vé gần đây</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {(recentBookings?.items ?? []).map((booking) => (
                            <div key={booking.id} className="flex items-center justify-between text-sm">
                                <div>
                                    <p className="font-medium">{booking.code} - {booking.guestInfo.name}</p>
                                    <p className="text-muted-foreground">{booking.originName} {'->'} {booking.destinationName}</p>
                                </div>
                                <p className="text-muted-foreground text-xs">{formatVndCurrency(booking.totalAmount)}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
