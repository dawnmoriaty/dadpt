import { format } from 'date-fns';
import {
    ArrowRight,
    Calendar,
    Copy,
    MapPin,
    Ticket,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

import { useCancelBooking, useMyBookings } from '../hooks'
import type { Booking, BookingStatus } from '../types'

const statusConfig: Record<BookingStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pending: { label: 'Pending Payment', variant: 'outline' },
    paid: { label: 'Paid', variant: 'default' },
    cancelled: { label: 'Cancelled', variant: 'destructive' },
    expired: { label: 'Expired', variant: 'secondary' },
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(amount)
}

function BookingStatusBadge({ status }: { status: BookingStatus }) {
    const config = statusConfig[status] ?? { label: status, variant: 'secondary' as const }
    return <Badge variant={config.variant}>{config.label}</Badge>
}

function BookingCard({ booking, onCancel }: { booking: Booking; onCancel: (id: number) => void }) {
    const [showCancel, setShowCancel] = useState(false)
    const canCancel = booking.status === 'pending'

    const copyCode = () => {
        navigator.clipboard.writeText(booking.code)
        toast.success('Booking code copied!')
    }

    return (
        <>
            <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        {/* Left: Booking info */}
                        <div className="flex-1 space-y-3">
                            {/* Code & Status */}
                            <div className="flex items-center gap-3 flex-wrap">
                                <button
                                    onClick={copyCode}
                                    className="flex items-center gap-1.5 font-mono font-bold text-base hover:text-primary transition-colors"
                                    title="Click to copy"
                                >
                                    <Ticket className="h-4 w-4" />
                                    {booking.code}
                                    <Copy className="h-3 w-3 text-muted-foreground" />
                                </button>
                                <BookingStatusBadge status={booking.status} />
                            </div>

                            {/* Route */}
                            {(booking.originName || booking.destinationName) && (
                                <div className="flex items-center gap-2 text-sm">
                                    <MapPin className="h-3.5 w-3.5 text-primary/60" />
                                    <span>{booking.originName ?? '—'}</span>
                                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>{booking.destinationName ?? '—'}</span>
                                </div>
                            )}

                            {/* Time */}
                            {booking.departureTime && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {format(new Date(booking.departureTime), 'dd/MM/yyyy HH:mm')}
                                </div>
                            )}

                            {/* Seats */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-muted-foreground">Seats:</span>
                                {booking.seatCodes.map((seat) => (
                                    <Badge key={seat} variant="secondary" className="text-xs">
                                        {seat}
                                    </Badge>
                                ))}
                            </div>

                            {/* Guest info */}
                            <div className="text-sm text-muted-foreground">
                                <span>{booking.guestInfo.name}</span>
                                <span className="mx-1">•</span>
                                <span>{booking.guestInfo.phone}</span>
                            </div>
                        </div>

                        {/* Right: Amount & Actions */}
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-3">
                            <div className="text-right">
                                <p className="text-2xl font-bold text-primary">
                                    {formatCurrency(booking.totalAmount)}
                                </p>
                                <p className="text-xs text-muted-foreground capitalize">
                                    {booking.paymentMethod}
                                </p>
                            </div>

                            {canCancel && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => setShowCancel(true)}
                                >
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <ConfirmDialog
                open={showCancel}
                onOpenChange={setShowCancel}
                title="Cancel Booking"
                description={`Are you sure you want to cancel booking ${booking.code}? This action cannot be undone.`}
                confirmLabel="Cancel Booking"
                onConfirm={() => {
                    onCancel(booking.id)
                    setShowCancel(false)
                }}
            />
        </>
    )
}

export function MyBookingsPage() {
    const [page, setPage] = useState(1)
    const { data, isLoading } = useMyBookings(page)
    const cancelBooking = useCancelBooking()

    const bookings = data?.items ?? []
    const total = data?.total ?? 0

    return (
        <div className="container max-w-4xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">My Bookings</h1>
                    <p className="text-muted-foreground">
                        {total > 0 ? `${total} booking${total > 1 ? 's' : ''} found` : 'No bookings yet'}
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="p-6">
                                <div className="h-20 bg-muted rounded" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : bookings.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <Ticket className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-semibold mb-1">No bookings yet</h3>
                        <p className="text-muted-foreground">
                            Search for trips and book your first ride!
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {bookings.map((booking: Booking) => (
                        <BookingCard
                            key={booking.id}
                            booking={booking}
                            onCancel={(id) => cancelBooking.mutate(id)}
                        />
                    ))}

                    {/* Pagination */}
                    {total > 20 && (
                        <div className="flex justify-center gap-2 pt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => p - 1)}
                            >
                                Previous
                            </Button>
                            <span className="flex items-center px-3 text-sm text-muted-foreground">
                                Page {page}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={bookings.length < 20}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
