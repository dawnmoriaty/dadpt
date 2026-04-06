import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as z from 'zod'

import {
    SearchForm,
    TripSearchResults,
    TripFilterSidebar,
    type TripFilters,
    useSearchTrips,
    useBrowseTrips,
} from '@/modules/booking'
import type { SearchTripsFormData } from '@/modules/booking'
import { usePublicBusTypes } from '@/modules/bustype'
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
    const { t } = useTranslation()

    const [filters, setFilters] = useState<TripFilters>({
        providerIds: [],
        busTypeIds: [],
    })

    const hasSearchParams = search.originId > 0 && search.destinationId > 0 && search.departureDate.length > 0

    // Directed search (origin + destination + date)
    const { data: searchData, isLoading: searchLoading } = useSearchTrips({
        originId: search.originId,
        destinationId: search.destinationId,
        departureDate: search.departureDate,
        minSeats: search.passengers,
    })

    // Browse mode (no search params — show upcoming trips)
    const { data: browseData, isLoading: browseLoading } = useBrowseTrips(
        hasSearchParams
              ? undefined
              : {
                    providerIds: filters.providerIds,
                    busTypeIds: filters.busTypeIds,
                    page: 1,
                    limit: 10,
                },
    )

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

    const handleFilterChange = useCallback((f: TripFilters) => setFilters(f), [])

    // Load bus types for client-side name matching
    const { data: busTypes } = usePublicBusTypes()

    // Client-side filter for searched results (sidebar filters apply to both modes)
    const displayTrips = useMemo(() => {
        const source = hasSearchParams ? searchData?.items : browseData?.items
        if (!source) return []

        return source.filter((trip) => {
            if (filters.providerIds.length > 0 && !filters.providerIds.includes(trip.providerId)) {
                return false
            }
            if (filters.busTypeIds.length > 0 && trip.busTypeName) {
                const selectedNames = (busTypes ?? [])
                    .filter((bt) => filters.busTypeIds.includes(bt.id))
                    .map((bt) => bt.name)
                if (!selectedNames.includes(trip.busTypeName)) {
                    return false
                }
            }
            return true
        })
    }, [hasSearchParams, searchData, browseData, filters, busTypes])

    const isLoading = hasSearchParams ? searchLoading : browseLoading

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">{t('searchPage.title')}</h1>
                <p className="text-muted-foreground">{t('searchPage.subtitle')}</p>
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

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar filters */}
                <aside className="lg:w-72 flex-shrink-0">
                    <TripFilterSidebar filters={filters} onChange={handleFilterChange} />
                </aside>

                {/* Results */}
                <main className="flex-1 min-w-0">
                    {!hasSearchParams && !isLoading && displayTrips.length > 0 && (
                        <p className="text-sm text-muted-foreground mb-3">
                            {t('searchPage.browseHint', 'Hiển thị các chuyến xe sắp khởi hành. Tìm kiếm để lọc theo tuyến đường cụ thể.')}
                        </p>
                    )}
                    <TripSearchResults
                        trips={displayTrips}
                        isLoading={isLoading}
                        passengers={search.passengers}
                        onSelect={handleSelectTrip}
                    />
                </main>
            </div>
        </div>
    )
}
