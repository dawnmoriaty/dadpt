import { format } from 'date-fns'
import {
    ArrowRight,
    Clock,
    Flame,
    MapPin,
    Ticket,
    Users,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { Trip } from '@/modules/trip'

interface TripSearchResultsProps {
    trips: Trip[]
    isLoading: boolean
    passengers: number
    onSelect: (trip: Trip) => void
}

function formatTime(dateStr: string) {
    try {
        return format(new Date(dateStr), 'HH:mm')
    } catch {
        return dateStr
    }
}

function formatDate(dateStr: string) {
    try {
        return format(new Date(dateStr), 'dd/MM/yyyy')
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

function TripResultCard({ trip, passengers, onSelect }: { trip: Trip; passengers: number; onSelect: () => void }) {
    const hasEnoughSeats = trip.availableSeats >= passengers

    return (
        <Card className={`transition-all hover:shadow-md ${!hasEnoughSeats ? 'opacity-60' : 'cursor-pointer hover:border-primary/30'}`}>
            <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                    {/* Route & Time */}
                    <div className="flex-1 p-5">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Ticket className="h-4 w-4" />
                                <span>{trip.providerName}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {trip.isHotDeal && (
                                    <Badge variant="destructive" className="gap-1">
                                        <Flame className="h-3 w-3" />
                                        Hot Deal
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="flex items-center gap-4 mb-4">
                            <div className="text-center">
                                <p className="text-2xl font-bold">{formatTime(trip.departureTime)}</p>
                                <p className="text-xs text-muted-foreground">{formatDate(trip.departureTime)}</p>
                            </div>

                            <div className="flex-1 flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-full border-2 border-primary" />
                                <div className="flex-1 relative">
                                    <div className="border-t-2 border-dashed border-muted-foreground/30" />
                                    <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                                        <span className="text-xs text-muted-foreground flex items-center gap-1 bg-background px-1">
                                            <Clock className="h-3 w-3" />
                                            {getDuration(trip.departureTime, trip.arrivalTime)}
                                        </span>
                                    </div>
                                </div>
                                <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                            </div>

                            <div className="text-center">
                                <p className="text-2xl font-bold">{formatTime(trip.arrivalTime)}</p>
                                <p className="text-xs text-muted-foreground">{formatDate(trip.arrivalTime)}</p>
                            </div>
                        </div>

                        {/* Origin -> Destination */}
                        <div className="flex items-center gap-3 text-sm">
                            <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-primary/60" />
                                <span>{trip.originName}</span>
                                <span className="text-muted-foreground">({trip.originCity})</span>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                            <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-primary" />
                                <span>{trip.destinationName}</span>
                                <span className="text-muted-foreground">({trip.destinationCity})</span>
                            </div>
                        </div>
                    </div>

                    <Separator orientation="vertical" className="hidden md:block" />
                    <Separator className="md:hidden" />

                    {/* Price & CTA */}
                    <div className="flex md:flex-col items-center justify-between md:justify-center gap-3 p-5 md:w-52">
                        <div className="text-center">
                            {trip.isHotDeal && trip.finalPrice < trip.basePrice && (
                                <p className="text-sm text-muted-foreground line-through">
                                    {formatCurrency(trip.basePrice)}
                                </p>
                            )}
                            <p className="text-2xl font-bold text-primary">
                                {formatCurrency(trip.finalPrice)}
                            </p>
                            <p className="text-xs text-muted-foreground">/passenger</p>
                        </div>

                        <div className="flex flex-col items-center gap-2">
                            <div className="flex items-center gap-1 text-sm">
                                <Users className="h-3.5 w-3.5" />
                                <span className={`font-medium ${trip.availableSeats <= 5 ? 'text-amber-600' : 'text-green-600'}`}>
                                    {trip.availableSeats} seats left
                                </span>
                            </div>
                            <Button
                                onClick={onSelect}
                                disabled={!hasEnoughSeats}
                                className="w-full"
                            >
                                {hasEnoughSeats ? 'Book Now' : 'Full'}
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export function TripSearchResults({ trips, isLoading, passengers, onSelect }: TripSearchResultsProps) {
    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                        <CardContent className="p-6">
                            <div className="h-24 bg-muted rounded" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    if (trips.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <MapPin className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-1">No trips found</h3>
                    <p className="text-muted-foreground max-w-md">
                        No trips match your search criteria. Try adjusting the date or route.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
                Found <strong>{trips.length}</strong> trip{trips.length > 1 ? 's' : ''}
            </p>
            {trips.map((trip) => (
                <TripResultCard
                    key={trip.id}
                    trip={trip}
                    passengers={passengers}
                    onSelect={() => onSelect(trip)}
                />
            ))}
        </div>
    )
}
