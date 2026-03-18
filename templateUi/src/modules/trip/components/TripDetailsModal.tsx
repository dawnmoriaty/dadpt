import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
    Building2,
    Bus,
    CreditCard,
    MapPin,
    Ticket,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

import type { Trip } from '../types'

import { TripStatusBadge } from './TripStatusBadge'

interface TripDetailsModalProps {
    trip: Trip | null
    isOpen: boolean
    onClose: () => void
}

const formatDateTime = (dateStr: string) => {
    try {
        return format(new Date(dateStr), "HH:mm, dd 'thg' MM, yyyy", { locale: vi })
    } catch {
        return dateStr
    }
}

const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0,
    }).format(price)
}

export function TripDetailsModal({ trip, isOpen, onClose }: TripDetailsModalProps) {
    if (!trip) return null

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between pr-8">
                        <DialogTitle className="text-2xl font-bold">Trip Details</DialogTitle>
                        <TripStatusBadge status={trip.status} />
                    </div>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Route Info */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-muted/50 rounded-xl border">
                        <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-emerald-600 mt-0.5" />
                            <div>
                                <p className="font-semibold text-lg">{trip.originName}</p>
                                <p className="text-sm text-muted-foreground">{trip.originCity}</p>
                                <p className="text-sm font-medium mt-1 text-emerald-600">{formatDateTime(trip.departureTime)}</p>
                            </div>
                        </div>
                        <div className="hidden md:flex flex-col items-center px-4 flex-1 max-w-[200px] mx-auto">
                            <div className="w-full h-px bg-border relative">
                                <Bus className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground bg-background px-1" />
                            </div>
                        </div>
                        <Separator className="my-4 md:hidden" />
                        <div className="flex items-start gap-3 text-right">
                            <div className="text-right">
                                <p className="font-semibold text-lg">{trip.destinationName}</p>
                                <p className="text-sm text-muted-foreground">{trip.destinationCity}</p>
                                <p className="text-sm font-medium mt-1 text-emerald-600">{formatDateTime(trip.arrivalTime)}</p>
                            </div>
                            <MapPin className="w-5 h-5 text-rose-600 mt-0.5" />
                        </div>
                    </div>

                    {/* General Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                    <Building2 className="w-4 h-4" /> Provider Info
                                </h4>
                                <div className="space-y-2 pl-6">
                                    <p className="text-sm"><span className="text-muted-foreground">Name:</span> <span className="font-medium">{trip.providerName}</span></p>
                                    <p className="text-sm"><span className="text-muted-foreground">Bus Type:</span> <Badge variant="outline" className="ml-2">{trip.busTypeName || 'Standard'}</Badge></p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                    <Ticket className="w-4 h-4" /> Booking Info
                                </h4>
                                <div className="space-y-2 pl-6">
                                    <p className="text-sm"><span className="text-muted-foreground">Available Seats:</span> <Badge variant={trip.availableSeats > 10 ? 'success' : 'warning'} className="ml-2">{trip.availableSeats}</Badge></p>
                                    <p className="text-sm"><span className="text-muted-foreground">Booked Seats:</span> <span className="font-medium ml-2">{trip.bookedSeats?.length || 0}</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <Separator />

                    {/* Price Info */}
                    <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                            <CreditCard className="w-4 h-4" /> Pricing Details
                        </h4>
                        <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border">
                            <div>
                                <p className="text-sm text-muted-foreground">Base Price</p>
                                <p className="text-lg font-medium">{formatPrice(trip.basePrice)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Final Price {trip.isHotDeal && <Badge variant="destructive" className="ml-2">Hot Deal</Badge>}</p>
                                <p className="text-lg font-bold text-primary">{formatPrice(trip.finalPrice)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button variant="outline" onClick={onClose}>Close</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
