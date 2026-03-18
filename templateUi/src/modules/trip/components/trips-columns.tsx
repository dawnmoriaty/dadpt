import { type ColumnDef } from '@tanstack/react-table'
import { ArrowRight, MoreHorizontal } from 'lucide-react'

import { DataTableColumnHeader } from '@/components/common/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import type { Trip, TripStatus } from '../types'

import { TripStatusBadge } from './TripStatusBadge'

interface TripsColumnsOptions {
    onUpdateStatus: (id: number, status: TripStatus) => void
    onViewDetails: (trip: Trip) => void
    onEdit: (trip: Trip) => void
}

const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    })

const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0,
    }).format(price)

export function getTripsColumns({ onUpdateStatus, onViewDetails, onEdit }: TripsColumnsOptions): ColumnDef<Trip>[] {
    return [
        {
            id: 'select',
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && 'indeterminate')
                    }
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                    className="translate-y-0.5"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                    className="translate-y-0.5"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: 'status',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Status" />
            ),
            cell: ({ row }) => <TripStatusBadge status={row.getValue('status')} />,
            filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
        },
        {
            id: 'route',
            header: 'Route',
            cell: ({ row }) => (
                <div className="flex items-center gap-2 font-medium">
                    <span className="truncate max-w-[120px]">{row.original.originName}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate max-w-[120px]">{row.original.destinationName}</span>
                </div>
            ),
            enableSorting: false,
        },
        {
            accessorKey: 'providerName',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Provider" />
            ),
            cell: ({ row }) => (
                <Badge variant="secondary">{row.getValue('providerName')}</Badge>
            ),
        },
        {
            accessorKey: 'departureTime',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Departure" />
            ),
            cell: ({ row }) => (
                <span className="text-sm">{formatDate(row.getValue('departureTime'))}</span>
            ),
        },
        {
            accessorKey: 'finalPrice',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Price" />
            ),
            cell: ({ row }) => (
                <span className="font-semibold text-primary">
                    {formatPrice(row.getValue('finalPrice'))}
                </span>
            ),
        },
        {
            accessorKey: 'availableSeats',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Seats" />
            ),
            cell: ({ row }) => {
                const seats = row.getValue('availableSeats') as number
                return (
                    <Badge variant={seats > 10 ? 'success' : 'warning'}>
                        {seats}
                    </Badge>
                )
            },
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => {
                const trip = row.original
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(trip)}>Chỉnh sửa chuyến</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {trip.status === 'scheduled' && (
                                <>
                                    <DropdownMenuItem
                                        onClick={() => onUpdateStatus(trip.id, 'departed')}
                                        className="text-yellow-600"
                                    >
                                        Mark as Departed
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => onUpdateStatus(trip.id, 'cancelled')}
                                        className="text-red-600"
                                    >
                                        Cancel Trip
                                    </DropdownMenuItem>
                                </>
                            )}
                            {trip.status === 'departed' && (
                                <DropdownMenuItem
                                    onClick={() => onUpdateStatus(trip.id, 'completed')}
                                    className="text-emerald-600"
                                >
                                    Mark as Completed
                                </DropdownMenuItem>
                            )}
                            {(trip.status === 'completed' || trip.status === 'cancelled') && (
                                <DropdownMenuItem disabled className="text-muted-foreground">
                                    No actions available
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onViewDetails(trip)}>View Details</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
            enableSorting: false,
            enableHiding: false,
        },
    ]
}
