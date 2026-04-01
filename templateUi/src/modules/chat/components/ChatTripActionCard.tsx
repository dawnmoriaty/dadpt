import { useNavigate } from '@tanstack/react-router'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { ArrowRight, Bus, CalendarDays, Clock3, CreditCard, MapPin, Ticket, Users } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatVndCurrency } from '@/modules/booking/utils'

import type { TripUiActionItem } from '../types'

import { ChatTripDetailsDialog } from './ChatTripDetailsDialog'

interface ChatTripActionCardProps {
    item: TripUiActionItem
    defaultPassengers?: number
}

export function ChatTripActionCard({ item, defaultPassengers = 1 }: ChatTripActionCardProps) {
    const navigate = useNavigate()
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const detailUrl = getDetailUrl(item)
    const detailTripId = resolveDetailTripId(item, detailUrl)
    const bookIntent = getBookIntent(item, defaultPassengers)
    const actionTripId = bookIntent.tripId > 0 ? bookIntent.tripId : detailTripId
    const resolvedTripId = detailTripId > 0 ? detailTripId : actionTripId

    const departureTime = formatDateTime(item.departure_time)
    const arrivalTime = formatDateTime(item.arrival_time)
    const routeText = `${item.origin_name || 'Điểm đi'} → ${item.destination_name || 'Điểm đến'}`
    const imageUrl = item.image_url?.trim()
    const recommendationReason = item.score_explain?.reasons?.[0]
    const isFallbackCard = actionTripId <= 0

    const handleViewDetail = () => {
        if (resolvedTripId > 0) {
            setIsDetailOpen(true)
            return
        }

        if (!detailUrl) {
            return
        }

        window.location.href = detailUrl
    }

    const handleBookNow = () => {
        const targetTripId = actionTripId
        if (targetTripId <= 0) {
            return
        }

        setIsDetailOpen(false)

        void navigate({
            to: '/trips/$tripId',
            params: { tripId: String(targetTripId) },
            search: {
                passengers: bookIntent.passengers,
                paymentMethod: bookIntent.paymentMethod,
            },
        })
    }

    const handleFallbackAction = () => {
        const cta = item.cta
        if (!cta) {
            return
        }

        if (cta.action === 'open_search') {
            const payload = cta.payload ?? {}
            void navigate({
                to: '/search',
                search: {
                    originId: 0,
                    destinationId: 0,
                    departureDate: payload.date ?? '',
                    passengers: payload.passengers ?? 1,
                },
            })
            return
        }

        if (cta.action === 'prefill_message') {
            const payload = cta.payload ?? {}
            if (payload.message) {
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('chat:quick-message', { detail: payload.message }))
                }
                void navigate({ to: '/chat' })
            }
        }
    }

    return (
        <>
            <Card className="overflow-hidden border-border/70 bg-card shadow-sm transition-colors hover:border-primary/30 hover:shadow-md">
                {isFallbackCard ? (
                    <CardContent className="space-y-3 p-3">
                        <div className="space-y-1">
                            <p className="text-sm font-semibold text-foreground">{item.provider_name || 'Chưa chọn được chuyến phù hợp'}</p>
                            <p className="text-xs text-muted-foreground">{item.description || 'Bạn có thể mở trang tìm kiếm để chọn chuyến phù hợp hơn.'}</p>
                        </div>

                        <Button type="button" size="sm" className="h-8 w-full rounded-lg" onClick={handleFallbackAction}>
                            <Bus className="mr-1.5 h-3.5 w-3.5" />
                            {item.cta?.label ?? 'Tiếp tục tìm chuyến'}
                        </Button>
                    </CardContent>
                ) : (
                    <CardContent className="p-0">
                        <div className="flex">
                            <div className="relative h-auto w-28 shrink-0 bg-muted sm:w-32">
                                {imageUrl ? (
                                    <img src={imageUrl} alt={item.provider_name || routeText} className="h-full w-full object-cover" loading="lazy" />
                                ) : (
                                    <div className="flex h-full min-h-32 items-center justify-center text-muted-foreground">
                                        <Bus className="h-5 w-5" />
                                    </div>
                                )}
                                    <div className="absolute inset-x-0 top-0 flex items-center justify-between p-1.5">
                                        {item.tags?.[0] ? (
                                            <Badge variant={mapBadgeVariant(item.tags[0])} className="rounded-full px-1.5 py-0.5 text-[10px]">
                                                {renderTag(item.tags[0])}
                                            </Badge>
                                    ) : null}
                                    <div className="rounded-full bg-background/85 px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow-sm">
                                        {Math.max(0, item.available_seats ?? 0)} ghế
                                    </div>
                                </div>
                            </div>

                            <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 space-y-0.5">
                                        <p className="truncate text-sm font-semibold text-foreground">{item.provider_name || 'Nhà xe'}</p>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <MapPin className="h-3.5 w-3.5 text-primary" />
                                            <span className="truncate">{routeText}</span>
                                        </div>
                                    </div>

                                    {typeof item.price === 'number' && item.price > 0 ? (
                                        <div className="text-right">
                                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Giá</p>
                                            <p className="text-sm font-semibold text-primary">{formatVndCurrency(item.price)}</p>
                                        </div>
                                    ) : null}
                                </div>

                                <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-border/60 bg-muted/30 p-2 text-[11px]">
                                    <div className="flex items-center gap-1 text-foreground">
                                        <Clock3 className="h-3.5 w-3.5 text-primary" />
                                        <span className="truncate">{departureTime}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-foreground">
                                        <CalendarDays className="h-3.5 w-3.5 text-primary" />
                                        <span className="truncate">{arrivalTime}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-foreground">
                                        <Users className="h-3.5 w-3.5 text-primary" />
                                        <span className="truncate">{Math.max(0, item.available_seats ?? 0)} ghế trống</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-foreground">
                                        <CreditCard className="h-3.5 w-3.5 text-primary" />
                                        <span>COD</span>
                                    </div>
                                </div>

                                {recommendationReason ? (
                                    <p className="truncate rounded-lg bg-primary/5 px-2 py-1 text-[11px] text-primary">AI: {recommendationReason}</p>
                                ) : null}

                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-8 rounded-lg border-primary/20 bg-background px-2 text-xs"
                                        onClick={handleViewDetail}
                                    >
                                        Xem chi tiết
                                        <ArrowRight className="ml-1 h-3 w-3" />
                                    </Button>
                                    <Button type="button" size="sm" className="h-8 rounded-lg px-2 text-xs" onClick={handleBookNow}>
                                        <Ticket className="mr-1 h-3 w-3" />
                                        Đặt vé
                                    </Button>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span>{item.status ? normalizeStatus(item.status) : 'Sẵn sàng đặt vé'}</span>
                                    <span className={cn('font-medium', item.available_seats && item.available_seats > 5 ? 'text-emerald-600' : 'text-amber-600')}>
                                        {item.available_seats && item.available_seats > 5 ? 'Còn nhiều chỗ' : 'Sắp hết chỗ'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>

            {!isFallbackCard ? (
                <ChatTripDetailsDialog
                    tripId={resolvedTripId}
                    isOpen={isDetailOpen}
                    onClose={() => setIsDetailOpen(false)}
                    onBookNow={handleBookNow}
                />
            ) : null}
        </>
    )
}

function getDetailUrl(item: TripUiActionItem): string {
    if (item.detail_url) {
        return item.detail_url
    }

    const button = item.buttons?.find((candidate) => candidate.action === 'open_url')
    if (button && typeof button.value === 'string') {
        return button.value
    }

    return ''
}

function getBookIntent(item: TripUiActionItem, defaultPassengers: number): {
    tripId: number
    passengers: number
    paymentMethod?: 'bank_transfer' | 'cod' | 'visa'
    label: string
} {
    let tripId = parsePositiveInt(item.book_now?.trip_id) ?? parsePositiveInt(item.trip_id) ?? 0
    let passengers = parsePositiveInt(item.book_now?.passengers) ?? Math.max(1, defaultPassengers)
    let paymentMethod = normalizePaymentMethod(item.book_now?.payment_method)
    let label = 'Đặt vé luôn'

    const button = item.buttons?.find((candidate) => candidate.action === 'book_ticket')
    if (!button) {
        return {
            tripId,
            passengers,
            paymentMethod,
            label,
        }
    }

    if (button.label?.trim()) {
        label = button.label.trim()
    }

    if (button.value && typeof button.value !== 'string' && !Array.isArray(button.value)) {
        const value = button.value as Record<string, unknown>
        tripId = parsePositiveInt(value.trip_id) ?? tripId
        passengers = parsePositiveInt(value.passengers) ?? passengers
        paymentMethod = normalizePaymentMethod(
            (value.payment_method as string | undefined) ?? (value.paymentMethod as string | undefined) ?? paymentMethod,
        )
    }

    return {
            tripId,
            passengers,
            paymentMethod,
            label,
        }
}

function parsePositiveInt(value: unknown): number | undefined {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return undefined
    }
    return Math.round(parsed)
}

function resolveDetailTripId(item: TripUiActionItem, detailUrl: string): number {
    const fromItem = parsePositiveInt(item.trip_id)
    if (fromItem) {
        return fromItem
    }

    const fromBookNow = parsePositiveInt(item.book_now?.trip_id)
    if (fromBookNow) {
        return fromBookNow
    }

    const fromButtons = item.buttons
        ?.filter((button) => button.action === 'book_ticket' && button.value && typeof button.value !== 'string' && !Array.isArray(button.value))
        .map((button) => parsePositiveInt((button.value as Record<string, unknown>).trip_id))
        .find((value): value is number => Boolean(value))

    if (fromButtons) {
        return fromButtons
    }

    const fromUrl = extractTripIdFromDetailUrl(detailUrl)
    if (fromUrl) {
        return fromUrl
    }

    return 0
}

function extractTripIdFromDetailUrl(detailUrl: string): number | undefined {
    if (!detailUrl) {
        return undefined
    }

    const matched = detailUrl.match(/\/trips\/(\d+)(?:[/?#]|$)/i)
    if (!matched) {
        return undefined
    }

    return parsePositiveInt(matched[1])
}

function normalizePaymentMethod(value: unknown): 'bank_transfer' | 'cod' | 'visa' | undefined {
    if (typeof value !== 'string') {
        return undefined
    }

    if (value === 'bank_transfer' || value === 'cod' || value === 'visa') {
        return value
    }

    return undefined
}

function renderTag(tag: 'best_price' | 'faster' | 'premium'): string {
    if (tag === 'best_price') {
        return 'Giá tốt'
    }
    if (tag === 'faster') {
        return 'Đi sớm'
    }
    return 'Cao cấp'
}

function mapBadgeVariant(tag: 'best_price' | 'faster' | 'premium'): 'success' | 'info' | 'warning' {
    if (tag === 'best_price') {
        return 'success'
    }
    if (tag === 'faster') {
        return 'info'
    }
    return 'warning'
}

function normalizeStatus(status: string): string {
    if (status === 'scheduled') {
        return 'Đang mở bán'
    }
    if (status === 'completed') {
        return 'Đã hoàn thành'
    }
    if (status === 'cancelled') {
        return 'Đã hủy'
    }
    return status
}

function formatDateTime(value?: string): string {
    if (!value) {
        return '--'
    }

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
        return value
    }

    return format(parsed, "HH:mm, dd/MM", { locale: vi })
}
