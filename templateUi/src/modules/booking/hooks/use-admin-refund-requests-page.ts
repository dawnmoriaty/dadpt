import { useMemo, useState } from 'react'

import type { Booking } from '../types'

import { useApproveRefund, useRefundRequests, useRejectRefund } from './use-admin-refund-hooks'
import { useRefundSSE } from './useRefundSSE'

interface RefundConfirmAction {
    type: 'approve' | 'reject'
    booking: Booking
}

interface UseAdminRefundRequestsPageResult {
    page: number
    totalPages: number
    canGoPreviousPage: boolean
    canGoNextPage: boolean
    data: ReturnType<typeof useRefundRequests>['data']
    isLoading: boolean
    confirmAction: RefundConfirmAction | null
    isConfirmPending: boolean
    goToPreviousPage: () => void
    goToNextPage: () => void
    openApproveConfirm: (booking: Booking) => void
    openRejectConfirm: (booking: Booking) => void
    closeConfirm: () => void
    handleConfirm: () => void
}

export function useAdminRefundRequestsPage(pageSize = 20): UseAdminRefundRequestsPageResult {
    const [page, setPage] = useState(1)
    const [confirmAction, setConfirmAction] = useState<RefundConfirmAction | null>(null)

    const { data, isLoading } = useRefundRequests(page, pageSize)
    const approveMutation = useApproveRefund()
    const rejectMutation = useRejectRefund()

    useRefundSSE()

    const totalPages = useMemo(() => {
        if (!data) {
            return 0
        }
        return Math.ceil(data.total / pageSize)
    }, [data, pageSize])

    function goToPreviousPage() {
        setPage((currentPage) => Math.max(1, currentPage - 1))
    }

    function goToNextPage() {
        setPage((currentPage) => {
            if (totalPages <= 0) {
                return currentPage
            }
            return Math.min(totalPages, currentPage + 1)
        })
    }

    function openApproveConfirm(booking: Booking) {
        setConfirmAction({ type: 'approve', booking })
    }

    function openRejectConfirm(booking: Booking) {
        setConfirmAction({ type: 'reject', booking })
    }

    function closeConfirm() {
        setConfirmAction(null)
    }

    function handleConfirm() {
        if (!confirmAction) {
            return
        }

        const { type, booking } = confirmAction

        if (type === 'approve') {
            approveMutation.mutate(
                { id: booking.id },
                {
                    onSettled: closeConfirm,
                }
            )
            return
        }

        rejectMutation.mutate(
            { id: booking.id },
            {
                onSettled: closeConfirm,
            }
        )
    }

    return {
        page,
        totalPages,
        canGoPreviousPage: page > 1,
        canGoNextPage: totalPages > 0 && page < totalPages,
        data,
        isLoading,
        confirmAction,
        isConfirmPending: approveMutation.isPending || rejectMutation.isPending,
        goToPreviousPage,
        goToNextPage,
        openApproveConfirm,
        openRejectConfirm,
        closeConfirm,
        handleConfirm,
    }
}
