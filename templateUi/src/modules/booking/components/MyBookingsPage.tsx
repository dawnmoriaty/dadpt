import { useTranslation } from 'react-i18next'

import { useMyBookingsPage } from '../hooks'

import { MyBookingCard } from './MyBookingCard'
import { MyBookingsEmpty } from './MyBookingsEmpty'
import { MyBookingsLoading } from './MyBookingsLoading'
import { MyBookingsPagination } from './MyBookingsPagination'

export function MyBookingsPage() {
    const { t } = useTranslation()
    const {
        page,
        total,
        bookings,
        isLoading,
        showPagination,
        canGoPreviousPage,
        canGoNextPage,
        goToPreviousPage,
        goToNextPage,
        cancelBooking,
        refundBooking,
        resumePayment,
        copyPaymentLink,
    } = useMyBookingsPage()

    return (
        <div className="container max-w-4xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">{t('myBookings.title')}</h1>
                    <p className="text-muted-foreground">
                        {total > 0 ? t('myBookings.found', { count: total }) : t('myBookings.noBookings')}
                    </p>
                </div>
            </div>

            {isLoading ? (
                <MyBookingsLoading />
            ) : bookings.length === 0 ? (
                <MyBookingsEmpty />
            ) : (
                <div className="space-y-3">
                    {bookings.map((booking) => (
                        <MyBookingCard
                            key={booking.id}
                            booking={booking}
                            onCancel={cancelBooking}
                            onRefund={refundBooking}
                            onResumePayment={resumePayment}
                            onCopyPaymentLink={copyPaymentLink}
                        />
                    ))}

                    {showPagination && (
                        <MyBookingsPagination
                            page={page}
                            canGoPreviousPage={canGoPreviousPage}
                            canGoNextPage={canGoNextPage}
                            onPreviousPage={goToPreviousPage}
                            onNextPage={goToNextPage}
                        />
                    )}
                </div>
            )}
        </div>
    )
}
