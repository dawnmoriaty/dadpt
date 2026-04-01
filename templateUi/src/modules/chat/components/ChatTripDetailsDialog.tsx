import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Building2, Bus, Clock3, CreditCard, ImageOff, MapPin, Ticket, Users } from 'lucide-react'
import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { formatVndCurrency } from '@/modules/booking/utils'
import type { Trip } from '@/modules/trip'
import { TripStatusBadge, useTrip } from '@/modules/trip'

interface ChatTripDetailsDialogProps {
    tripId: number
    isOpen: boolean
    onClose: () => void
    onBookNow: () => void
}

export function ChatTripDetailsDialog({ tripId, isOpen, onClose, onBookNow }: ChatTripDetailsDialogProps) {
    const { data: trip, isLoading, isError } = useTrip(isOpen ? tripId : 0)

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="z-[70] max-h-[82vh] max-w-[640px] overflow-y-auto p-0">
                <DialogHeader className="space-y-1.5 border-b px-4 py-3">
                    <div className="flex items-start justify-between gap-3 pr-8">
                        <div className="space-y-1">
                            <DialogTitle className="text-lg">Chi tiết chuyến đi</DialogTitle>
                            <DialogDescription className="text-xs">Xem nhanh thông tin chuyến đi ngay trong khung chat.</DialogDescription>
                        </div>
                        {trip ? <TripStatusBadge status={trip.status} /> : null}
                    </div>
                </DialogHeader>

                {isLoading ? <LoadingState /> : null}
                {!isLoading && isError ? <ErrorState onClose={onClose} /> : null}
                {!isLoading && trip ? <TripContent trip={trip} onBookNow={onBookNow} onClose={onClose} /> : null}
            </DialogContent>
        </Dialog>
    )
}

function LoadingState() {
    return (
        <div className="space-y-3 p-4">
            <div className="h-36 animate-pulse rounded-xl bg-muted" />
            <div className="grid grid-cols-2 gap-2">
                <div className="h-16 animate-pulse rounded-lg bg-muted" />
                <div className="h-16 animate-pulse rounded-lg bg-muted" />
                <div className="h-16 animate-pulse rounded-lg bg-muted" />
                <div className="h-16 animate-pulse rounded-lg bg-muted" />
            </div>
            <div className="h-20 animate-pulse rounded-xl bg-muted" />
        </div>
    )
}

function ErrorState({ onClose }: { onClose: () => void }) {
    return (
        <div className="space-y-3 p-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <ImageOff className="h-5 w-5" />
            </div>
            <div className="space-y-1">
                <p className="font-medium text-foreground">Không tải được chi tiết chuyến đi</p>
                <p className="text-sm text-muted-foreground">Backend chưa trả dữ liệu hoặc chuyến đi không còn khả dụng.</p>
            </div>
            <div className="flex justify-center">
                <Button type="button" variant="outline" onClick={onClose}>
                    Đóng
                </Button>
            </div>
        </div>
    )
}

function TripContent({
    trip,
    onBookNow,
    onClose,
}: {
    trip: Trip
    onBookNow: () => void
    onClose: () => void
}) {
    return (
        <div className="space-y-4 p-4">
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
                {trip.busImageUrl ? (
                    <div className="relative h-36 overflow-hidden bg-muted">
                        <img src={trip.busImageUrl} alt={trip.providerName} className="h-full w-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 text-white">
                            <div className="min-w-0">
                                <p className="truncate text-base font-semibold">{trip.providerName}</p>
                                <p className="truncate text-xs text-white/85">{trip.originName} {'->'} {trip.destinationName}</p>
                            </div>
                            <div className="rounded-lg bg-white/15 px-2 py-1.5 text-right backdrop-blur-sm">
                                <p className="text-[10px] uppercase tracking-wide text-white/70">Giá vé</p>
                                <p className="text-sm font-semibold">{formatVndCurrency(trip.finalPrice)}</p>
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className="space-y-3 p-3.5">
                    {!trip.busImageUrl ? (
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-base font-semibold text-foreground">{trip.providerName}</p>
                                <p className="text-xs text-muted-foreground">
                                    {trip.originName} {'->'} {trip.destinationName}
                                </p>
                            </div>
                            <p className="text-sm font-semibold text-primary">{formatVndCurrency(trip.finalPrice)}</p>
                        </div>
                    ) : null}

                    <div className="grid gap-2 rounded-lg border border-border/60 bg-muted/30 p-2 text-xs sm:grid-cols-2">
                        <DetailItem icon={Clock3} label="Khởi hành" value={formatDateTime(trip.departureTime)} />
                        <DetailItem icon={MapPin} label="Đến nơi" value={formatDateTime(trip.arrivalTime)} />
                        <DetailItem icon={Users} label="Ghế trống" value={`${trip.availableSeats} ghế`} />
                        <DetailItem icon={CreditCard} label="Thanh toán" value="COD / Online" />
                    </div>

                    <div className="grid gap-2 md:grid-cols-2">
                        <InfoBlock icon={Building2} title="Thông tin xe">
                            <p>Nhà xe: {trip.providerName}</p>
                            <p>Loại xe: {trip.busTypeName || 'Tiêu chuẩn'}</p>
                            <p>Ghế đã đặt: {trip.bookedSeats.length}</p>
                        </InfoBlock>
                        <InfoBlock icon={Ticket} title="Giá và ưu đãi">
                            <p>Giá gốc: {formatVndCurrency(trip.basePrice)}</p>
                            <p className="font-medium text-primary">Giá hiện tại: {formatVndCurrency(trip.finalPrice)}</p>
                            <div className="pt-1">{trip.isHotDeal ? <Badge variant="destructive">Ưu đãi</Badge> : <Badge variant="outline">Giá thường</Badge>}</div>
                        </InfoBlock>
                    </div>

                    {(trip.pickupPoints.length > 0 || trip.dropoffPoints.length > 0) ? <Separator /> : null}

                    {(trip.pickupPoints.length > 0 || trip.dropoffPoints.length > 0) ? (
                        <div className="grid gap-2 md:grid-cols-2">
                            <PointsList icon={MapPin} title="Điểm đón" points={trip.pickupPoints} emptyLabel="Chưa có điểm đón" />
                            <PointsList icon={Bus} title="Điểm trả" points={trip.dropoffPoints} emptyLabel="Chưa có điểm trả" />
                        </div>
                    ) : null}

                    <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:justify-end">
                        <Button type="button" size="sm" variant="outline" onClick={onClose}>
                            Đóng
                        </Button>
                        <Button type="button" size="sm" onClick={onBookNow}>
                            Đặt vé
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function DetailItem({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Clock3
    label: string
    value: string
}) {
    return (
        <div className="flex items-start gap-1.5 rounded-md bg-background/80 p-2">
            <Icon className="mt-0.5 h-3.5 w-3.5 text-primary" />
            <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-0.5 font-medium text-foreground">{value}</p>
            </div>
        </div>
    )
}

function InfoBlock({
    icon: Icon,
    title,
    children,
}: {
    icon: typeof Clock3
    title: string
    children: ReactNode
}) {
    return (
        <div className="space-y-2 rounded-lg border border-border/60 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Icon className="h-4 w-4 text-primary" />
                {title}
            </div>
            <div className="space-y-1 text-xs leading-5 text-muted-foreground">{children}</div>
        </div>
    )
}

function PointsList({
    icon: Icon,
    title,
    points,
    emptyLabel,
}: {
    icon: typeof Clock3
    title: string
    points: Array<{ name: string; time: string; surcharge: number }>
    emptyLabel: string
}) {
    return (
        <div className="space-y-2 rounded-lg border border-border/60 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Icon className="h-4 w-4 text-primary" />
                {title}
            </div>

            {points.length === 0 ? <p className="text-xs text-muted-foreground">{emptyLabel}</p> : null}

            {points.length > 0 ? (
                <div className="space-y-2">
                    {points.map((point, index) => (
                        <div key={`${title}-${point.name}-${index}`} className="rounded-md bg-muted/30 px-2.5 py-2 text-xs">
                            <div className="flex items-center justify-between gap-3">
                                <p className="font-medium text-foreground">{point.name}</p>
                                <p className="text-xs text-muted-foreground">{point.time}</p>
                            </div>
                            {point.surcharge > 0 ? <p className="mt-1 text-xs text-primary">Phụ thu: {formatVndCurrency(point.surcharge)}</p> : null}
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    )
}

function formatDateTime(value: string): string {
    try {
        return format(new Date(value), 'HH:mm, dd/MM/yyyy', { locale: vi })
    } catch {
        return value
    }
}
