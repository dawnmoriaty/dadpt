import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import type { Booking } from '../types'
import {
    buildPaymentResumePath,
    getLatestPendingBookingFromHistory,
    getPendingBookingFromHistory,
    syncPendingHistoryFromBookings,
} from '../utils'

import { useBookingEventsSSE } from './use-booking-events-sse'
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
    resumePayment: (code: string) => void
    copyPaymentLink: (code: string) => void
}

const PAGE_SIZE = 20

export function useMyBookingsPage(): UseMyBookingsPageResult {
    const navigate = useNavigate()
    const [page, setPage] = useState(1)
    const { data, isLoading } = useMyBookings(page)
    const cancelMutation = useCancelBooking()

    useBookingEventsSSE()

    const bookings = useMemo(() => data?.items ?? [], [data?.items])
    const total = data?.total ?? 0

    useEffect(() => {
        syncPendingHistoryFromBookings(bookings)
    }, [bookings])

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

    function resumePayment(code: string) {
        let targetCode = code
        let orderCode = ''

        if (!targetCode) {
            const latest = getLatestPendingBookingFromHistory()
            if (latest) {
                targetCode = latest.code
                orderCode = latest.orderCode ?? ''
            }
        }

        if (!targetCode) {
            toast.error('Không có đơn chờ thanh toán để tiếp tục.')
            return
        }

        void navigate({
            to: '/payment/$bookingCode',
            params: { bookingCode: targetCode },
            search: { orderCode },
        })
    }

    function copyPaymentLink(code: string) {
        const history = getPendingBookingFromHistory(code)
        const link = `${window.location.origin}${buildPaymentResumePath(code, history?.orderCode)}`
        navigator.clipboard.writeText(link)
        toast.success('Đã copy link tiếp tục thanh toán')
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
        resumePayment,
        copyPaymentLink,
    }
}
