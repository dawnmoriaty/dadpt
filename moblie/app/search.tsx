import { useLocalSearchParams } from 'expo-router'

import { PublicLayout } from '@/src/components/common'
import { HomeSearchCompactScreen, SearchResultsScreen } from '@/src/modules/trip'

export default function SearchPage() {
    const searchParams = useLocalSearchParams()
    const hasSearchParams =
        Number(searchParams.originId ?? 0) > 0 &&
        Number(searchParams.destinationId ?? 0) > 0 &&
        typeof searchParams.date === 'string' &&
        searchParams.date.length > 0

    return (
        <PublicLayout>
            {hasSearchParams ? (
                <SearchResultsScreen />
            ) : (
                <HomeSearchCompactScreen />
            )}
        </PublicLayout>
    )
}
