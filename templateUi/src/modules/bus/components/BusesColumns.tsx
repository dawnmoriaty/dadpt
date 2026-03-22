import { type ColumnDef } from '@tanstack/react-table'
import { Image, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

import { DataTableColumnHeader } from '@/components/common/data-table'
import { OptimizedImage } from '@/components/common/optimized-image'
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

import type { Bus } from '../types'

const statusVariants: Record<string, 'success' | 'warning' | 'destructive'> = {
    active: 'success',
    maintenance: 'warning',
    retired: 'destructive',
}

interface BusesColumnsOptions {
    onEdit: (bus: Bus) => void
    onDelete: (id: number) => void
}

export function getBusesColumns({ onEdit, onDelete }: BusesColumnsOptions): ColumnDef<Bus>[] {
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
                    aria-label="Chọn tất cả"
                    className="translate-y-[2px]"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Chọn hàng"
                    className="translate-y-[2px]"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            id: 'image',
            header: 'Hình ảnh',
            cell: ({ row }) => {
                const bus = row.original
                return bus.imageUrl ? (
                    <OptimizedImage
                        src={bus.imageUrl}
                        alt={bus.licensePlate}
                        width={48}
                        height={48}
                        className="rounded"
                        objectFit="cover"
                    />
                ) : (
                    <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                        <Image className="w-6 h-6 text-muted-foreground" />
                    </div>
                )
            },
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: 'licensePlate',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Biển số xe" />
            ),
            cell: ({ row }) => (
                <span className="font-medium">{row.getValue('licensePlate')}</span>
            ),
        },
        {
            accessorKey: 'providerName',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Nhà xe" />
            ),
        },
        {
            accessorKey: 'busTypeName',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Loại xe" />
            ),
        },
        {
            accessorKey: 'totalSeats',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Số ghế" />
            ),
        },
        {
            accessorKey: 'status',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Trạng thái" />
            ),
            cell: ({ row }) => {
                const status = row.getValue('status') as string
                const statusLabel =
                    status === 'active'
                        ? 'Đang hoạt động'
                        : status === 'maintenance'
                            ? 'Bảo trì'
                            : status === 'retired'
                                ? 'Ngừng khai thác'
                                : status
                return (
                    <Badge variant={statusVariants[status] ?? 'secondary'}>
                        {statusLabel}
                    </Badge>
                )
            },
        },
        {
            id: 'actions',
            header: 'Thao tác',
            cell: ({ row }) => {
                const bus = row.original
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Mở menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(bus)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Chỉnh sửa
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => onDelete(bus.id)}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Xóa
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
            enableSorting: false,
            enableHiding: false,
        },
    ]
}
