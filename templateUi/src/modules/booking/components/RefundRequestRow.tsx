import { format } from 'date-fns'
import { Check, MapPin, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'

import type { Booking } from '../types'
import { formatVndCurrency } from '../utils'

interface RefundRequestRowProps {
    booking: Booking
    onApprove: () => void
    onReject: () => void
}

export function RefundRequestRow({ booking, onApprove, onReject }: RefundRequestRowProps) {
    const { t } = useTranslation()

    const routeLabel = booking.originName && booking.destinationName ? `${booking.originName} → ${booking.destinationName}` : '—'

    return (
        <TableRow>
            <TableCell className="font-mono font-medium">{booking.code}</TableCell>

            <TableCell>
                <div className="space-y-0.5">
                    <p className="text-sm font-medium">{booking.guestInfo.name}</p>
                    <p className="text-xs text-muted-foreground">{booking.guestInfo.phone}</p>
                </div>
            </TableCell>

            <TableCell>
                <div className="flex items-center gap-1 text-sm">
                    <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate max-w-[200px]">{routeLabel}</span>
                </div>
            </TableCell>

            <TableCell>
                <div className="flex flex-wrap gap-1">
                    {booking.seatCodes.map((seat) => (
                        <Badge key={seat} variant="outline" className="text-xs">
                            {seat}
                        </Badge>
                    ))}
                </div>
            </TableCell>

            <TableCell className="text-right font-medium">{formatVndCurrency(booking.totalAmount)}</TableCell>

            <TableCell className="text-sm">
                {booking.departureTime ? format(new Date(booking.departureTime), 'dd/MM/yyyy HH:mm') : '—'}
            </TableCell>

            <TableCell className="text-sm text-muted-foreground">{format(new Date(booking.updatedAt), 'dd/MM/yyyy HH:mm')}</TableCell>

            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-300 hover:bg-green-50"
                        onClick={onApprove}
                    >
                        <Check className="h-4 w-4 mr-1" />
                        {t('refundRequests.approve')}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        onClick={onReject}
                    >
                        <X className="h-4 w-4 mr-1" />
                        {t('refundRequests.reject')}
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    )
}
