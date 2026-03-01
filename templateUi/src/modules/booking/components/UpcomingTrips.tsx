import { useNavigate } from '@tanstack/react-router'
import { format } from 'date-fns'
import { ArrowRight, Bus, Clock, Flame, MapPin, Ticket, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { OptimizedImage } from '@/components/common/optimized-image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Trip } from '@/modules/trip'

import { useBrowseTrips } from '../hooks'

function formatTime(dateStr: string) {
    try {
        return format(new Date(dateStr), 'HH:mm')
    } catch {
        return dateStr
    }
}

function formatDate(dateStr: string) {
    try {
        return format(new Date(dateStr), 'dd/MM')
    } catch {
        return dateStr
    }
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(amount)
}

function getDuration(departure: string, arrival: string) {
    const diff = new Date(arrival).getTime() - new Date(departure).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h${minutes > 0 ? `${minutes}m` : ''}`
}

function UpcomingTripCard({ trip }: { trip: Trip }) {
    const navigate = useNavigate()
    const { t } = useTranslation()

    return (
        <Card
            className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5"
            onClick={() =>
                navigate({
                    to: '/trips/$tripId',
                    params: { tripId: trip.id.toString() },
                    search: { passengers: 1 },
                })
            }
        >
            {/* Bus / route image */}
            <OptimizedImage
                src={trip.busImageUrl}
                alt={`${trip.originName} → ${trip.destinationName}`}
                className="w-full h-36 object-cover"
                fallbackClassName="w-full h-36"
            />
            <CardContent className="p-4">
                {/* Provider & badge row */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Ticket className="h-3.5 w-3.5" />
                        <span className="font-medium truncate">{trip.providerName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {trip.busTypeName && (
                            <Badge variant="secondary" className="text-xs">
                                <Bus className="h-3 w-3 mr-1" />
                                {trip.busTypeName}
                            </Badge>
                        )}
                        {trip.isHotDeal && (
                            <Badge variant="destructive" className="gap-1 text-xs">
                                <Flame className="h-3 w-3" />
                                Hot
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Route */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1.5 text-sm min-w-0">
                        <MapPin className="h-3.5 w-3.5 text-primary/60 flex-shrink-0" />
                        <span className="truncate font-medium">{trip.originName}</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex items-center gap-1.5 text-sm min-w-0">
                        <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        <span className="truncate font-medium">{trip.destinationName}</span>
                    </div>
                </div>

                {/* Time & Duration */}
                <div className="flex items-center gap-4 mb-3 text-sm">
                    <span className="font-bold text-lg">{formatTime(trip.departureTime)}</span>
                    <span className="text-muted-foreground text-xs">{formatDate(trip.departureTime)}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                        <Clock className="h-3 w-3" />
                        {getDuration(trip.departureTime, trip.arrivalTime)}
                    </span>
                </div>

                {/* Price & Seats */}
                <div className="flex items-center justify-between">
                    <div>
                        {trip.isHotDeal && trip.finalPrice < trip.basePrice && (
                            <span className="text-xs text-muted-foreground line-through mr-2">
                                {formatCurrency(trip.basePrice)}
                            </span>
                        )}
                        <span className="text-lg font-bold text-primary">
                            {formatCurrency(trip.finalPrice)}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                        <Users className="h-3.5 w-3.5" />
                        <span
                            className={`font-medium ${trip.availableSeats <= 5 ? 'text-amber-600' : 'text-green-600'}`}
                        >
                            {t('searchPage.seatsLeft', { count: trip.availableSeats })}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export function UpcomingTrips() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { data, isLoading } = useBrowseTrips({ page: 1, limit: 12 })

    if (isLoading) {
        return (
            <section className="container mx-auto px-4 py-16">
                <h2 className="text-2xl font-bold text-center mb-8">
                    {t('home.upcomingTrips', 'Chuyến xe sắp khởi hành')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="p-4">
                                <div className="h-32 bg-muted rounded" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>
        )
    }

    const trips = data?.items ?? []

    if (trips.length === 0) return null

    return (
        <section className="container mx-auto px-4 py-16">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">
                    {t('home.upcomingTrips', 'Chuyến xe sắp khởi hành')}
                </h2>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate({ to: '/search' })}
                >
                    {t('home.viewAll', 'Xem tất cả')} →
                </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {trips.map((trip) => (
                    <UpcomingTripCard key={trip.id} trip={trip} />
                ))}
            </div>
        </section>
    )
}
