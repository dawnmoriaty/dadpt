import { useMemo, useState } from 'react'

import type { Booking } from '../types'

import { useApproveRefund, useRefundRequests, useRejectRefund } from './use-refund-requests-hooks'
import { useRefundSSE } from './use-refund-sse'

interface RefundConfirmAction {
    type: 'approve' | 'reject'
    booking: Booking
}

interface UseRefundRequestsPageResult {
    page: number
    totalPages: number
    canGoPreviousPage: boolean
    canGoNextPage: boolean
    data: ReturnType<typeof useRefundRequests>['data']
    isLoading: boolean
    error: Error | null
    confirmAction: RefundConfirmAction | null
    refundReference: string
    refundNote: string
    confirmCode: string
    canConfirmApprove: boolean
    isConfirmPending: boolean
    goToPreviousPage: () => void
    goToNextPage: () => void
    openApproveConfirm: (booking: Booking) => void
    openRejectConfirm: (booking: Booking) => void
    closeConfirm: () => void
    setRefundReference: (value: string) => void
    setRefundNote: (value: string) => void
    setConfirmCode: (value: string) => void
    handleConfirm: () => void
}

export function useRefundRequestsPage(pageSize = 10): UseRefundRequestsPageResult {
    const [page, setPage] = useState(1)
    const [confirmAction, setConfirmAction] = useState<RefundConfirmAction | null>(null)
    const [refundReference, setRefundReference] = useState('')
    const [refundNote, setRefundNote] = useState('')
    const [confirmCode, setConfirmCode] = useState('')

    const { data, isLoading, error } = useRefundRequests(page, pageSize)
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
        setRefundReference('')
        setRefundNote('')
        setConfirmCode('')
        setConfirmAction({ type: 'approve', booking })
    }

    function openRejectConfirm(booking: Booking) {
        setRefundReference('')
        setRefundNote('')
        setConfirmCode('')
        setConfirmAction({ type: 'reject', booking })
    }

    function closeConfirm() {
        setRefundReference('')
        setRefundNote('')
        setConfirmCode('')
        setConfirmAction(null)
    }

    function handleConfirm() {
        if (!confirmAction) {
            return
        }

        const { type, booking } = confirmAction

        if (type === 'approve') {
            approveMutation.mutate(
                {
                    id: booking.id,
                    data: {
                        refundReference: refundReference.trim(),
                        refundNote: refundNote.trim(),
                        confirmCode: confirmCode.trim(),
                    },
                },
                {
                    onSettled: closeConfirm,
                }
            )
            return
        }

        rejectMutation.mutate(
            {
                id: booking.id,
                data: {
                    confirmCode: confirmCode.trim(),
                },
            },
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
        error: (error as Error | null) ?? null,
        confirmAction,
        refundReference,
        refundNote,
        confirmCode,
        canConfirmApprove:
            !!confirmAction
            && confirmCode.trim().toUpperCase() === confirmAction.booking.code.trim().toUpperCase()
            && (confirmAction.type !== 'approve' || refundReference.trim().length > 0),
        isConfirmPending: approveMutation.isPending || rejectMutation.isPending,
        goToPreviousPage,
        goToNextPage,
        openApproveConfirm,
        openRejectConfirm,
        closeConfirm,
        setRefundReference,
        setRefundNote,
        setConfirmCode,
        handleConfirm,
    }
}
