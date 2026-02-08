import { ArrowRight, Calendar, Plus, Bus } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

import { useTrips, useUpdateTripStatus, useCreateTrip } from '../hooks'
import type { TripStatus, CreateTripRequest } from '../types'

import { TripForm } from './TripForm'
import { TripStatusBadge } from './TripStatusBadge'

const statusTabs: { value: TripStatus | ''; label: string; color: string }[] = [
    { value: '', label: 'All Trips', color: 'bg-muted' },
    { value: 'scheduled', label: 'Scheduled', color: 'bg-blue-500' },
    { value: 'departed', label: 'Departed', color: 'bg-yellow-500' },
    { value: 'completed', label: 'Completed', color: 'bg-emerald-500' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
]

export function TripsPage() {
    const [statusFilter, setStatusFilter] = useState<TripStatus | ''>('')
    const [isFormOpen, setIsFormOpen] = useState(false)

    const { data, isLoading } = useTrips({
        page: 1,
        pageSize: 50,
        status: statusFilter || undefined,
    })
    const updateStatusMutation = useUpdateTripStatus()
    const createTripMutation = useCreateTrip()

    const handleCreateTrip = (formData: CreateTripRequest): void => {
        createTripMutation.mutate(formData, {
            onSuccess: () => setIsFormOpen(false),
        })
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0,
        }).format(price)
    }

    const allTrips = data?.items ?? []
    const statusCounts = allTrips.reduce((acc, trip) => {
        acc[trip.status] = (acc[trip.status] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-linear-to-br from-emerald-500 via-emerald-600 to-teal-500 shadow-lg shadow-emerald-500/30">
                        <Bus className="h-7 w-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Trips</h1>
                        <p className="text-muted-foreground">
                            Manage {allTrips.length} scheduled bus trips
                        </p>
                    </div>
                </div>
                <Button
                    onClick={() => setIsFormOpen(true)}
                    className="gap-2 bg-linear-to-r from-success to-info hover:opacity-90 shadow-lg shadow-success/25 transition-all hover:shadow-xl hover:-translate-y-0.5"
                >
                    <Plus className="h-4 w-4" />
                    Create Trip
                </Button>
            </div>

            {/* Status Tabs */}
            <div className="flex flex-wrap gap-2">
                {statusTabs.map((tab) => {
                    const count = tab.value ? statusCounts[tab.value] || 0 : allTrips.length
                    const isActive = statusFilter === tab.value
                    return (
                        <Button
                            key={tab.value}
                            variant={isActive ? 'default' : 'outline'}
                            size="sm"
                            className={`gap-2 transition-all ${isActive ? 'shadow-md' : 'hover:shadow-sm'}`}
                            onClick={() => setStatusFilter(tab.value)}
                        >
                            {tab.value && (
                                <span className={`h-2 w-2 rounded-full ${tab.color}`} />
                            )}
                            {tab.label}
                            <Badge variant={isActive ? 'secondary' : 'outline'} className="ml-1 h-5 px-1.5 text-xs">
                                {count}
                            </Badge>
                        </Button>
                    )
                })}
            </div>

            {/* Content */}
            {isLoading ? (
                <Card className="border-0 shadow-md">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead>Status</TableHead>
                                <TableHead>Route</TableHead>
                                <TableHead>Provider</TableHead>
                                <TableHead>Departure</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Seats</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            ) : allTrips.length === 0 ? (
                <Card className="border-0 shadow-md">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <div className="p-4 rounded-full bg-muted/50 mb-4">
                            <Bus className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <h3 className="font-semibold text-lg">No trips found</h3>
                        <p className="text-muted-foreground mt-1 text-center max-w-sm">
                            {statusFilter
                                ? `No ${statusFilter} trips at the moment.`
                                : 'Get started by creating your first bus trip.'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-0 shadow-md overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                <TableHead className="font-semibold w-[140px]">Status</TableHead>
                                <TableHead className="font-semibold">Route</TableHead>
                                <TableHead className="font-semibold">Provider</TableHead>
                                <TableHead className="font-semibold">Departure</TableHead>
                                <TableHead className="font-semibold">Price</TableHead>
                                <TableHead className="font-semibold w-[80px]">Seats</TableHead>
                                <TableHead className="font-semibold w-[200px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allTrips.map((trip) => (
                                <TableRow key={trip.id} className="group">
                                    <TableCell>
                                        <TripStatusBadge status={trip.status} />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 font-medium">
                                            <span>{trip.originName}</span>
                                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                            <span>{trip.destinationName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{trip.providerName}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-sm">
                                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                            {formatDate(trip.departureTime)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-semibold text-primary">
                                        {formatPrice(trip.finalPrice)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={trip.availableSeats > 10 ? 'success' : 'warning'}>
                                            {trip.availableSeats}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            {trip.status === 'scheduled' && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-500/10"
                                                        onClick={() => updateStatusMutation.mutate({ id: trip.id, status: 'departed' })}
                                                    >
                                                        Depart
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
                                                        onClick={() => updateStatusMutation.mutate({ id: trip.id, status: 'cancelled' })}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </>
                                            )}
                                            {trip.status === 'departed' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                                    onClick={() => updateStatusMutation.mutate({ id: trip.id, status: 'completed' })}
                                                >
                                                    Complete
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}

            {/* Create Trip Form */}
            <TripForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleCreateTrip}
                isLoading={createTripMutation.isPending}
            />
        </div>
    )
}
