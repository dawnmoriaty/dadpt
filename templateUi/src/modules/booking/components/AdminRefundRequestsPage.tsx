import { useTranslation } from 'react-i18next'

import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getApiErrorMessage } from '@/services/api/client'
 
import { useAdminRefundRequestsPage } from '../hooks'

import { AdminRefundRequestsEmpty } from './AdminRefundRequestsEmpty'
import { AdminRefundRequestsLoading } from './AdminRefundRequestsLoading'
import { AdminRefundRequestsTable } from './AdminRefundRequestsTable'

export function AdminRefundRequestsPage() {
    const { t } = useTranslation()
    const {
        page,
        totalPages,
        canGoPreviousPage,
        canGoNextPage,
        data,
        isLoading,
        error,
        confirmAction,
        refundReference,
        refundNote,
        canConfirmApprove,
        isConfirmPending,
        goToPreviousPage,
        goToNextPage,
        openApproveConfirm,
        openRejectConfirm,
        closeConfirm,
        setRefundReference,
        setRefundNote,
        handleConfirm,
    } = useAdminRefundRequestsPage()

    if (isLoading) {
        return <AdminRefundRequestsLoading />
    }

    const hasError = !!error

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

            {hasError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    {getApiErrorMessage(error, t('adminRefund.loadError'))}
                </div>
            )}

            {!hasError && (!data || data.items.length === 0) && <AdminRefundRequestsEmpty />}

            {!hasError && data && data.items.length > 0 && (
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
                disabled={confirmAction?.type === 'approve' && !canConfirmApprove}
                content={
                    confirmAction?.type === 'approve' ? (
                        <div className="space-y-3 pt-1">
                            <div className="space-y-1.5">
                                <Label htmlFor="refund-reference">{t('adminRefund.refundReference')}</Label>
                                <Input
                                    id="refund-reference"
                                    value={refundReference}
                                    onChange={(event) => setRefundReference(event.target.value)}
                                    placeholder={t('adminRefund.refundReferencePlaceholder')}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="refund-note">{t('adminRefund.refundNote')}</Label>
                                <Input
                                    id="refund-note"
                                    value={refundNote}
                                    onChange={(event) => setRefundNote(event.target.value)}
                                    placeholder={t('adminRefund.refundNotePlaceholder')}
                                />
                            </div>
                        </div>
                    ) : null
                }
            />
        </div>
    )
}
