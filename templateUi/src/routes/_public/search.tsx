import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import * as z from 'zod'

import { SearchForm, TripSearchResults, useSearchTrips } from '@/modules/booking'
import type { SearchTripsFormData } from '@/modules/booking'
import type { Trip } from '@/modules/trip'

const searchParamsSchema = z.object({
    originId: z.coerce.number().optional().default(0),
    destinationId: z.coerce.number().optional().default(0),
    departureDate: z.string().optional().default(''),
    passengers: z.coerce.number().optional().default(1),
})

export const Route = createFileRoute('/_public/search')({
    validateSearch: searchParamsSchema,
    component: SearchPage,
})

function SearchPage() {
    const navigate = useNavigate()
    const search = useSearch({ from: '/_public/search' })

    const hasSearchParams = search.originId > 0 && search.destinationId > 0 && search.departureDate.length > 0

    const { data, isLoading } = useSearchTrips({
        originId: search.originId,
        destinationId: search.destinationId,
        departureDate: search.departureDate,
        minSeats: search.passengers,
    })

    const handleSearch = (data: SearchTripsFormData) => {
        navigate({
            to: '/search',
            search: {
                originId: data.originId,
                destinationId: data.destinationId,
                departureDate: data.departureDate,
                passengers: data.passengers,
            },
        })
    }

    const handleSelectTrip = (trip: Trip) => {
        navigate({
            to: '/trips/$tripId',
            params: { tripId: trip.id.toString() },
            search: { passengers: search.passengers },
        })
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Search Trips</h1>
                <p className="text-muted-foreground">Find the best bus trips for your journey</p>
            </div>

            <div className="mb-8">
                <SearchForm
                    onSearch={handleSearch}
                    defaultValues={{
                        originId: search.originId,
                        destinationId: search.destinationId,
                        departureDate: search.departureDate,
                        passengers: search.passengers,
                    }}
                    compact
                />
            </div>

            {hasSearchParams && (
                <TripSearchResults
                    trips={data?.items ?? []}
                    isLoading={isLoading}
                    passengers={search.passengers}
                    onSelect={handleSelectTrip}
                />
            )}
        </div>
    )
}
