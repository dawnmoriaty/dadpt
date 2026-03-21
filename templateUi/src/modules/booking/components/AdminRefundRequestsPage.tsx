import { useTranslation } from 'react-i18next'

import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Badge } from '@/components/ui/badge'
 
import { useAdminRefundRequestsPage } from '../hooks'

import { AdminRefundRequestsEmpty } from './admin-refund-requests-empty'
import { AdminRefundRequestsLoading } from './admin-refund-requests-loading'
import { AdminRefundRequestsTable } from './admin-refund-requests-table'

export function AdminRefundRequestsPage() {
    const { t } = useTranslation()
    const {
        page,
        totalPages,
        canGoPreviousPage,
        canGoNextPage,
        data,
        isLoading,
        confirmAction,
        isConfirmPending,
        goToPreviousPage,
        goToNextPage,
        openApproveConfirm,
        openRejectConfirm,
        closeConfirm,
        handleConfirm,
    } = useAdminRefundRequestsPage()

    if (isLoading) {
        return <AdminRefundRequestsLoading />
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('adminRefund.title')}</h1>
                <p className="text-muted-foreground">{t('adminRefund.subtitle')}</p>
            </div>

            {/* Stats */}
            {data && data.total > 0 && (
                <Badge variant="secondary" className="text-sm">
                    {t('adminRefund.found', { count: data.total })}
                </Badge>
            )}

            {(!data || data.items.length === 0) && <AdminRefundRequestsEmpty />}

            {data && data.items.length > 0 && (
                <AdminRefundRequestsTable
                    bookings={data.items}
                    title={t('adminRefund.title')}
                    page={page}
                    totalPages={totalPages}
                    canGoPreviousPage={canGoPreviousPage}
                    canGoNextPage={canGoNextPage}
                    onPreviousPage={goToPreviousPage}
                    onNextPage={goToNextPage}
                    onApprove={openApproveConfirm}
                    onReject={openRejectConfirm}
                />
            )}

            {/* Confirm Dialog */}
            <ConfirmDialog
                open={confirmAction !== null}
                onOpenChange={(open) => {
                    if (!open) closeConfirm()
                }}
                title={confirmAction?.type === 'approve' ? t('adminRefund.approve') : t('adminRefund.reject')}
                description={
                    confirmAction?.type === 'approve'
                        ? t('adminRefund.approveConfirm', { code: confirmAction?.booking.code })
                        : t('adminRefund.rejectConfirm', { code: confirmAction?.booking.code })
                }
                confirmLabel={confirmAction?.type === 'approve' ? t('adminRefund.approve') : t('adminRefund.reject')}
                variant={confirmAction?.type === 'reject' ? 'destructive' : 'default'}
                onConfirm={handleConfirm}
                loading={isConfirmPending}
            />
        </div>
    )
}
