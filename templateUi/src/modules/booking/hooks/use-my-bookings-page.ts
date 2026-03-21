import { useMemo, useState } from 'react'

import type { Booking } from '../types'

import { useCancelBooking, useMyBookings } from './use-booking-hooks'

interface UseMyBookingsPageResult {
    page: number
    total: number
    bookings: Booking[]
    isLoading: boolean
    showPagination: boolean
    canGoPreviousPage: boolean
    canGoNextPage: boolean
    goToPreviousPage: () => void
    goToNextPage: () => void
    cancelBooking: (id: number) => void
    refundBooking: (id: number) => void
}

const PAGE_SIZE = 20

export function useMyBookingsPage(): UseMyBookingsPageResult {
    const [page, setPage] = useState(1)
    const { data, isLoading } = useMyBookings(page)
    const cancelMutation = useCancelBooking()

    const bookings = data?.items ?? []
    const total = data?.total ?? 0

    const showPagination = total > PAGE_SIZE

    const canGoNextPage = useMemo(() => {
        if (!showPagination) {
            return false
        }
        return bookings.length >= PAGE_SIZE
    }, [bookings.length, showPagination])

    function goToPreviousPage() {
        setPage((currentPage) => Math.max(1, currentPage - 1))
    }

    function goToNextPage() {
        setPage((currentPage) => currentPage + 1)
    }

    function cancelBooking(id: number) {
        cancelMutation.mutate({ id, isRefund: false })
    }

    function refundBooking(id: number) {
        cancelMutation.mutate({ id, isRefund: true })
    }

    return {
        page,
        total,
        bookings,
        isLoading,
        showPagination,
        canGoPreviousPage: page > 1,
        canGoNextPage,
        goToPreviousPage,
        goToNextPage,
        cancelBooking,
        refundBooking,
    }
}
