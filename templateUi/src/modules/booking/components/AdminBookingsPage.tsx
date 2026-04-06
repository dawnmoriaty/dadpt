import { Link } from '@tanstack/react-router'
import { Clock3, Download, Eye, Ticket, Wallet } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { useTrips } from '@/modules/trip'
import { getApiErrorMessage } from '@/services/api/client'

import {
    useAdminBookingStats,
    useAdminBookings,
    useAdminExportBookingsCsv,
    useTripSeatManifest,
} from '../hooks'
import type { AdminBookingListParams, Booking, BookingStatus } from '../types'
import { formatVndCurrency } from '../utils'

import { MyBookingsStatusBadge } from './MyBookingsStatusBadge'

const statusOptions: Array<{ value: BookingStatus | 'all'; label: string }> = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'pending', label: 'Chưa thanh toán' },
    { value: 'paid', label: 'Đã thanh toán' },
    { value: 'refund_pending', label: 'Chờ duyệt hoàn' },
    { value: 'cancelled', label: 'Đã hủy' },
    { value: 'expired', label: 'Hết hạn' },
    { value: 'refunded', label: 'Đã hoàn tiền' },
]

export function AdminBookingsPage() {
    const [page, setPage] = useState(1)
    const [status, setStatus] = useState<BookingStatus | 'all'>('all')
    const [tripId, setTripId] = useState<number | undefined>(undefined)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch] = useState('')
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

    const params: AdminBookingListParams = {
        page,
        pageSize: 10,
        status: status === 'all' ? '' : status,
        tripId,
        search,
    }

    const { data: stats, isLoading: statsLoading } = useAdminBookingStats()
    const { data: bookingData, isLoading } = useAdminBookings(params)
    const { data: tripData } = useTrips({ page: 1, pageSize: 100 })
    const { data: seatManifestData, isLoading: seatManifestLoading } = useTripSeatManifest(tripId)
    const exportMutation = useAdminExportBookingsCsv()

    const bookings = bookingData?.items ?? []
    const total = bookingData?.total ?? 0
    const totalPages = bookingData?.pageSize ? Math.max(1, Math.ceil(total / bookingData.pageSize)) : 1
    const seatManifest = seatManifestData?.items ?? []

    const handleExportCsv = () => {
        exportMutation.mutate(params, {
            onSuccess: (blob) => {
                const downloadUrl = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = downloadUrl
                link.download = 'admin-don-dat-ve.csv'
                link.click()
                URL.revokeObjectURL(downloadUrl)
                toast.success('Đã xuất CSV đơn đặt vé.')
            },
            onError: (error) => {
                toast.error(getApiErrorMessage(error, 'Không thể xuất danh sách đơn đặt vé.'))
            },
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Quản lý vé xe</h1>
                    <p className="text-muted-foreground">Xem đơn đặt vé, trạng thái thanh toán, chi tiết vé và ghế đang được giữ.</p>
                </div>
                <Button type="button" variant="outline" className="gap-2" onClick={handleExportCsv} disabled={exportMutation.isPending}>
                    <Download className="h-4 w-4" />
                    Xuất CSV
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatsCard title="Tổng đơn đặt vé" value={stats?.totalBookings ?? 0} icon={<Ticket className="h-5 w-5" />} loading={statsLoading} />
                <StatsCard title="Chưa thanh toán" value={stats?.unpaidBookings ?? 0} icon={<Clock3 className="h-5 w-5" />} loading={statsLoading} />
                <StatsCard title="Đã thanh toán" value={stats?.paidBookings ?? 0} icon={<Wallet className="h-5 w-5" />} loading={statsLoading} />
                <StatsCard title="Doanh thu đã thu" value={formatVndCurrency(stats?.paidRevenue ?? 0)} icon={<Wallet className="h-5 w-5" />} loading={statsLoading} />
            </div>

            <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
                <Card>
                    <CardHeader className="space-y-4">
                        <CardTitle>Danh sách vé</CardTitle>
                        <div className="grid gap-3 md:grid-cols-4">
                            <Input
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                                placeholder="Mã vé, tên khách, số điện thoại"
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        setPage(1)
                                        setSearch(searchInput.trim())
                                    }
                                }}
                            />
                            <Select
                                value={status}
                                onValueChange={(value) => {
                                    setStatus(value as BookingStatus | 'all')
                                    setPage(1)
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Lọc trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                    {statusOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={typeof tripId === 'number' ? String(tripId) : 'all'}
                                onValueChange={(value) => {
                                    setTripId(value === 'all' ? undefined : Number(value))
                                    setPage(1)
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Lọc theo chuyến" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả chuyến</SelectItem>
                                    {(tripData?.items ?? []).map((trip) => (
                                        <SelectItem key={trip.id} value={String(trip.id)}>
                                            #{trip.id} - {trip.originName} {'->'} {trip.destinationName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                        setPage(1)
                                        setSearch(searchInput.trim())
                                    }}
                                >
                                    Lọc
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => {
                                        setSearchInput('')
                                        setSearch('')
                                        setStatus('all')
                                        setTripId(undefined)
                                        setSelectedBooking(null)
                                        setPage(1)
                                    }}
                                >
                                    Đặt lại
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>{total} đơn đặt vé</span>
                            <span>Trang {page}/{totalPages}</span>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Mã vé</TableHead>
                                    <TableHead>Khách</TableHead>
                                    <TableHead>Chuyến</TableHead>
                                    <TableHead>Ghế</TableHead>
                                    <TableHead>Thanh toán</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead className="text-right">Tổng tiền</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-muted-foreground">Đang tải đơn đặt vé...</TableCell>
                                    </TableRow>
                                ) : bookings.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-muted-foreground">Không có đơn đặt vé phù hợp.</TableCell>
                                    </TableRow>
                                ) : (
                                    bookings.map((booking) => (
                                        <BookingRow
                                            key={booking.id}
                                            booking={booking}
                                            onViewTripSeats={() => {
                                                setTripId(booking.tripId)
                                                setSelectedBooking(booking)
                                            }}
                                            onSelect={() => setSelectedBooking(booking)}
                                        />
                                    ))
                                )}
                            </TableBody>
                        </Table>
                        <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                                Trước
                            </Button>
                            <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
                                Sau
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Ghế đã đặt</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {selectedBooking !== null && (
                            <div className="rounded-lg border bg-muted/20 p-4 text-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold">Đơn đang chọn: {selectedBooking.code}</p>
                                        <p className="mt-2">Khách: {selectedBooking.guestInfo.name}</p>
                                        <p>SĐT: {selectedBooking.guestInfo.phone}</p>
                                        <p>Thanh toán: {selectedBooking.paymentMethod}</p>
                                        <p>Ghế: {selectedBooking.seatCodes.join(', ')}</p>
                                    </div>
                                    <MyBookingsStatusBadge status={selectedBooking.status} />
                                </div>
                                <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                                    <Link to="/admin/bookings/$bookingId" params={{ bookingId: String(selectedBooking.id) }}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        Xem chi tiết đơn đặt vé
                                    </Link>
                                </Button>
                            </div>
                        )}

                        {typeof tripId !== 'number' ? (
                            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                                Chọn một chuyến hoặc bấm vào đơn để xem ai đang giữ ghế.
                            </div>
                        ) : seatManifestLoading ? (
                            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                                Đang tải danh sách ghế đã đặt...
                            </div>
                        ) : seatManifest.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                                Chưa có ghế nào đang được giữ ở chuyến này.
                            </div>
                        ) : (
                            seatManifest.map(({ seatCode, booking }) => (
                                <div key={`${booking.id}-${seatCode}`} className="rounded-lg border p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <Badge variant="secondary">{seatCode}</Badge>
                                        <MyBookingsStatusBadge status={booking.status} />
                                    </div>
                                    <p className="mt-2 font-medium">{booking.guestInfo.name}</p>
                                    <p className="text-sm text-muted-foreground">{booking.guestInfo.phone}</p>
                                    <p className="text-xs text-muted-foreground">Mã vé: {booking.code}</p>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <MiniInfoCard title="Doanh thu chờ thu" value={formatVndCurrency(stats?.unpaidRevenue ?? 0)} />
                <MiniInfoCard title="Chờ duyệt hoàn" value={String(stats?.refundPendingBookings ?? 0)} />
                <MiniInfoCard title="Chuyến đang có đặt vé" value={String(stats?.activeTripCount ?? 0)} />
            </div>
        </div>
    )
}

function StatsCard({ title, value, icon, loading }: { title: string; value: number | string; icon: ReactNode; loading: boolean }) {
    return (
        <Card>
            <CardContent className="flex items-center justify-between p-6">
                <div>
                    <p className="text-sm text-muted-foreground">{title}</p>
                    <p className="mt-2 text-2xl font-bold">{loading ? '...' : value}</p>
                </div>
                <div className="rounded-xl bg-primary/10 p-3 text-primary">{icon}</div>
            </CardContent>
        </Card>
    )
}

function MiniInfoCard({ title, value }: { title: string; value: string }) {
    return (
        <Card>
            <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">{title}</p>
                <p className="mt-2 text-xl font-semibold">{value}</p>
            </CardContent>
        </Card>
    )
}

interface BookingRowProps {
    booking: Booking
    onViewTripSeats: () => void
    onSelect: () => void
}

function BookingRow({ booking, onViewTripSeats, onSelect }: BookingRowProps) {
    return (
        <TableRow onClick={onSelect} className="cursor-pointer">
            <TableCell>
                <div>
                    <p className="font-medium">{booking.code}</p>
                    <p className="text-xs text-muted-foreground">#{booking.id}</p>
                </div>
            </TableCell>
            <TableCell>
                <div>
                    <p className="font-medium">{booking.guestInfo.name}</p>
                    <p className="text-xs text-muted-foreground">{booking.guestInfo.phone}</p>
                </div>
            </TableCell>
            <TableCell>
                <button type="button" className="text-left hover:underline" onClick={onViewTripSeats}>
                    <p className="font-medium">{booking.originName} {'->'} {booking.destinationName}</p>
                    <p className="text-xs text-muted-foreground">Chuyến #{booking.tripId}</p>
                </button>
            </TableCell>
            <TableCell>
                <div className="flex flex-wrap gap-1">
                    {booking.seatCodes.map((seatCode) => (
                        <Badge key={seatCode} variant="outline">{seatCode}</Badge>
                    ))}
                </div>
            </TableCell>
            <TableCell>
                <div>
                    <p className="capitalize">{booking.paymentMethod}</p>
                    {typeof booking.orderCode === 'string' && booking.orderCode.length > 0 ? (
                        <p className="text-xs text-muted-foreground">{booking.orderCode}</p>
                    ) : null}
                </div>
            </TableCell>
            <TableCell>
                <MyBookingsStatusBadge status={booking.status} />
            </TableCell>
            <TableCell className="text-right font-medium">{formatVndCurrency(booking.totalAmount)}</TableCell>
        </TableRow>
    )
}
