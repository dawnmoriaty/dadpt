import { useNavigate } from '@tanstack/react-router'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Bus, Clock3, CreditCard, MapPin, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatVndCurrency } from '@/modules/booking/utils'

import type { TripUiActionItem } from '../types'

interface ChatTripActionCardProps {
    item: TripUiActionItem
}

export function ChatTripActionCard({ item }: ChatTripActionCardProps) {
    const navigate = useNavigate()
    const tripId = item.trip_id
    const passengers = item.book_now?.passengers ?? 1

    const departureTime = formatDateTime(item.departure_time)
    const arrivalTime = formatDateTime(item.arrival_time)
    const routeText = `${item.origin_name || 'Diem di'} -> ${item.destination_name || 'Diem den'}`

    const handleBookNow = () => {
        if (tripId <= 0) {
            return
        }
        void navigate({
            to: '/trips/$tripId',
            params: { tripId: String(tripId) },
            search: { passengers, paymentMethod: 'cod' },
        })
    }

    const handleViewDetail = () => {
        if (tripId <= 0) {
            return
        }
        void navigate({
            to: '/trips/$tripId',
            params: { tripId: String(tripId) },
            search: { passengers },
        })
    }

    return (
        <Card className="border border-emerald-200 bg-emerald-50/40">
            <CardContent className="space-y-3 p-3">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <p className="text-sm font-semibold text-emerald-900">{item.provider_name || 'Nha xe'}</p>
                        <p className="text-xs text-emerald-800/80">{routeText}</p>
                        {item.tags && item.tags.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                                {item.tags.map((tag) => (
                                    <span
                                        key={`${tripId}-${tag}`}
                                        className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-800"
                                    >
                                        {renderTag(tag)}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    {typeof item.price === 'number' && item.price > 0 && (
                        <p className="text-sm font-bold text-emerald-900">{formatVndCurrency(item.price)}</p>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-2 text-xs text-emerald-900 md:grid-cols-2">
                    <div className="flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5" />
                        <span>{departureTime}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{arrivalTime}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        <span>Con {Math.max(0, item.available_seats ?? 0)} ghe</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>Book ngay (COD)</span>
                    </div>
                </div>

                {item.score_explain?.reasons && item.score_explain.reasons.length > 0 && (
                    <p className="text-xs text-emerald-900/80">Ly do goi y: {item.score_explain.reasons.join(', ')}</p>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="button" size="sm" className="flex-1" onClick={handleBookNow}>
                        <Bus className="mr-1.5 h-3.5 w-3.5" />
                        Book ve ngay
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="flex-1" onClick={handleViewDetail}>
                        Xem chi tiet
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

function renderTag(tag: 'best_price' | 'faster' | 'premium'): string {
    if (tag === 'best_price') {
        return 'Best Price'
    }
    if (tag === 'faster') {
        return 'Faster'
    }
    return 'Premium'
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
