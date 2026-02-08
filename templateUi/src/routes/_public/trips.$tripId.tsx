import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BookingForm } from '@/modules/booking'
import { tripApi } from '@/modules/trip/api'

const tripSearchSchema = z.object({
    passengers: z.coerce.number().optional().default(1),
})

export const Route = createFileRoute('/_public/trips/$tripId')({
    validateSearch: tripSearchSchema,
    component: TripBookingPage,
})

function TripBookingPage() {
    const { tripId } = useParams({ from: '/_public/trips/$tripId' })
    const search = useSearch({ from: '/_public/trips/$tripId' })
    const navigate = useNavigate()
    const [bookingCode, setBookingCode] = useState<string | null>(null)

    const { data: trip, isLoading, error } = useQuery({
        queryKey: ['trip-detail', tripId],
        queryFn: () => tripApi.getById(Number(tripId)),
        enabled: !!tripId,
    })

    if (isLoading) {
        return (
            <div className="container max-w-3xl mx-auto py-12 px-4">
                <Card className="animate-pulse">
                    <CardContent className="p-8">
                        <div className="h-64 bg-muted rounded" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (error || !trip) {
        return (
            <div className="container max-w-3xl mx-auto py-12 px-4">
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <h3 className="text-lg font-semibold mb-2">Trip not found</h3>
                        <p className="text-muted-foreground mb-4">The trip you're looking for doesn't exist or has been removed.</p>
                        <Button onClick={() => navigate({ to: '/search' })}>Back to Search</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Booking success state
    if (bookingCode) {
        return (
            <div className="container max-w-lg mx-auto py-16 px-4">
                <Card className="border-green-200 bg-green-50/50">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
                        <p className="text-muted-foreground mb-4">
                            Your booking has been created successfully.
                        </p>
                        <div className="bg-white border rounded-lg px-6 py-3 mb-6">
                            <p className="text-sm text-muted-foreground">Booking Code</p>
                            <p className="text-3xl font-mono font-bold text-primary tracking-wider">
                                {bookingCode}
                            </p>
                        </div>
                        <p className="text-sm text-muted-foreground mb-6">
                            Save this code to look up your booking later.
                        </p>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => navigate({ to: '/' })}>
                                Back to Home
                            </Button>
                            <Button onClick={() => navigate({ to: '/my-bookings' })}>
                                View My Bookings
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="container max-w-3xl mx-auto py-8 px-4">
            <Button
                variant="ghost"
                className="mb-6 gap-2"
                onClick={() => navigate({ to: '/search' })}
            >
                <ArrowLeft className="h-4 w-4" />
                Back to results
            </Button>

            <h1 className="text-2xl font-bold mb-6">Complete Your Booking</h1>

            <BookingForm
                trip={trip}
                passengers={search.passengers}
                onSuccess={setBookingCode}
            />
        </div>
    )
}
