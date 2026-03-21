import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

import type { Trip, TripStatus } from '../types'

import { TripStatusBadge } from './TripStatusBadge'

interface TripCardProps {
    trip: Trip
    onUpdateStatus: (id: number, status: TripStatus) => void
    onDelete: (id: number) => void
}

export function TripCard({ trip, onUpdateStatus, onDelete }: TripCardProps) {
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(price)
    }

    const statusGradients: Record<TripStatus, string> = {
        scheduled: 'from-blue-500/5 to-cyan-500/5',
        departed: 'from-yellow-500/5 to-orange-500/5',
        completed: 'from-emerald-500/5 to-green-500/5',
        cancelled: 'from-red-500/5 to-rose-500/5',
    }

    return (
        <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300">
            <div className={`absolute inset-0 bg-gradient-to-br ${statusGradients[trip.status]} group-hover:opacity-150 transition-all`} />
            <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <TripStatusBadge status={trip.status} />
                        <div>
                            <h3 className="font-semibold text-lg">
                                {trip.originName} → {trip.destinationName}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {trip.providerName}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {trip.status === 'scheduled' && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-yellow-500/10 border-yellow-500/20 text-yellow-700 hover:bg-yellow-500/20"
                                    onClick={() => onUpdateStatus(trip.id, 'departed')}
                                >
                                    Đánh dấu đã xuất bến
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-red-500/10 border-red-500/20 text-red-700 hover:bg-red-500/20"
                                    onClick={() => onUpdateStatus(trip.id, 'cancelled')}
                                >
                                    Hủy chuyến
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => onDelete(trip.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </>
                        )}
                        {trip.status === 'departed' && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-emerald-500/10 border-emerald-500/20 text-emerald-700 hover:bg-emerald-500/20"
                                onClick={() => onUpdateStatus(trip.id, 'completed')}
                            >
                                Đánh dấu hoàn thành
                            </Button>
                        )}
                    </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border/50">
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Khởi hành</p>
                        <p className="text-sm font-medium mt-0.5">{formatDate(trip.departureTime)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Đến nơi</p>
                        <p className="text-sm font-medium mt-0.5">{formatDate(trip.arrivalTime)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Giá vé</p>
                        <p className="text-sm font-semibold text-primary mt-0.5">{formatPrice(trip.finalPrice)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Số ghế</p>
                        <p className="text-sm font-medium mt-0.5">Còn {trip.availableSeats} ghế</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
