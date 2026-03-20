import { Bus, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

import { DataTable, DataTableViewOptions } from '@/components/common/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import { useTrips, useUpdateTripStatus, useCreateTrip, useUpdateTrip } from '../hooks'
import type { TripStatus, CreateTripRequest, Trip, UpdateTripRequest } from '../types'

import { TripDetailsModal } from './TripDetailsModal'
import { TripForm } from './TripForm'
import { getTripsColumns } from './trips-columns'

const statusTabs: { value: TripStatus | ''; label: string; color: string }[] = [
    { value: '', label: 'Tất cả chuyến', color: 'bg-muted' },
    { value: 'scheduled', label: 'Đã lên lịch', color: 'bg-blue-500' },
    { value: 'departed', label: 'Đã xuất bến', color: 'bg-yellow-500' },
    { value: 'completed', label: 'Hoàn thành', color: 'bg-emerald-500' },
    { value: 'cancelled', label: 'Đã hủy', color: 'bg-red-500' },
]

export function TripsPage() {
    const [statusFilter, setStatusFilter] = useState<TripStatus | ''>('')
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
    const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
    const [page, setPage] = useState(0)
    const [pageSize, setPageSize] = useState(20)

    const { data, isLoading } = useTrips({
        page: page + 1,
        pageSize,
        status: statusFilter || undefined,
    })
    const updateStatusMutation = useUpdateTripStatus()
    const createTripMutation = useCreateTrip()
    const updateTripMutation = useUpdateTrip()

    const columns = useMemo(
        () =>
            getTripsColumns({
                onUpdateStatus: (id, status) =>
                    updateStatusMutation.mutate({ id, status }),
                onViewDetails: (trip) => setSelectedTrip(trip),
                onEdit: (trip) => {
                    setEditingTrip(trip)
                    setIsFormOpen(true)
                },
            }),
        [updateStatusMutation],
    )

    const handleCreateTrip = (formData: CreateTripRequest): void => {
        createTripMutation.mutate(formData, {
            onSuccess: () => {
                setIsFormOpen(false)
                setEditingTrip(null)
            },
        })
    }

    const handleUpdateTrip = (id: number, formData: UpdateTripRequest): void => {
        updateTripMutation.mutate({ id, data: formData }, {
            onSuccess: () => {
                setIsFormOpen(false)
                setEditingTrip(null)
            },
        })
    }

    const allTrips = data?.items ?? []
    const totalPages = data?.total ? Math.ceil(data.total / pageSize) : 0
    const statusCounts = allTrips.reduce(
        (acc, trip) => {
            acc[trip.status] = (acc[trip.status] || 0) + 1
            return acc
        },
        {} as Record<string, number>,
    )

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
                            Manage {data?.total ?? 0} scheduled bus trips
                        </p>
                    </div>
                </div>
                <Button
                    onClick={() => {
                        setEditingTrip(null)
                        setIsFormOpen(true)
                    }}
                    className="gap-2 bg-linear-to-r from-success to-info hover:opacity-90 shadow-lg shadow-success/25 transition-all hover:shadow-xl hover:-translate-y-0.5"
                >
                    <Plus className="h-4 w-4" />
                    Create Trip
                </Button>
            </div>

            {/* Status Tabs */}
            <div className="flex flex-wrap gap-2">
                {statusTabs.map((tab) => {
                    const count = tab.value
                        ? statusCounts[tab.value] || 0
                        : allTrips.length
                    const isActive = statusFilter === tab.value
                    return (
                        <Button
                            key={tab.value}
                            variant={isActive ? 'default' : 'outline'}
                            size="sm"
                            className={`gap-2 transition-all ${isActive ? 'shadow-md' : 'hover:shadow-sm'}`}
                            onClick={() => {
                                setStatusFilter(tab.value)
                                setPage(0)
                            }}
                        >
                            {tab.value && (
                                <span className={`h-2 w-2 rounded-full ${tab.color}`} />
                            )}
                            {tab.label}
                            <Badge
                                variant={isActive ? 'secondary' : 'outline'}
                                className="ml-1 h-5 px-1.5 text-xs"
                            >
                                {count}
                            </Badge>
                        </Button>
                    )
                })}
            </div>

            {/* Content */}
            {isLoading ? (
                <Card className="border-0 shadow-md p-6">
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
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
                <DataTable
                    columns={columns}
                    data={allTrips}
                    pageCount={totalPages}
                    pageIndex={page}
                    pageSize={pageSize}
                    onPaginationChange={(newPage, newSize) => {
                        setPage(newPage)
                        setPageSize(newSize)
                    }}
                    toolbar={(table) => (
                        <div className="flex items-center justify-end">
                            <DataTableViewOptions table={table} />
                        </div>
                    )}
                />
            )}

            {/* Create Trip Form */}
            <TripForm
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false)
                    setEditingTrip(null)
                }}
                onCreate={handleCreateTrip}
                onUpdate={handleUpdateTrip}
                initialTrip={editingTrip}
                isLoading={createTripMutation.isPending || updateTripMutation.isPending}
            />

            {/* Trip Details Modal */}
            <TripDetailsModal
                trip={selectedTrip}
                isOpen={selectedTrip !== null}
                onClose={() => setSelectedTrip(null)}
            />
        </div>
    )
}
