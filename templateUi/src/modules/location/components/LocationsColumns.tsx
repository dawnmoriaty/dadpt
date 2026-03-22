import { type ColumnDef } from '@tanstack/react-table'
import { Image, MapPin, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

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

import type { Location } from '../types'

interface LocationsColumnsOptions {
    onEdit: (location: Location) => void
    onDelete: (id: number) => void
}

export function getLocationsColumns({ onEdit, onDelete }: LocationsColumnsOptions): ColumnDef<Location>[] {
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
                const location = row.original
                return location.imageUrl ? (
                    <OptimizedImage
                        src={location.imageUrl}
                        alt={location.name}
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
            accessorKey: 'name',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Tên địa điểm" />
            ),
            cell: ({ row }) => (
                <span className="font-medium">{row.getValue('name')}</span>
            ),
        },
        {
            accessorKey: 'city',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Tỉnh/Thành phố" />
            ),
            cell: ({ row }) => (
                <Badge variant="secondary" className="gap-1">
                    <MapPin className="h-3 w-3" />
                    {row.getValue('city')}
                </Badge>
            ),
        },
        {
            accessorKey: 'address',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Địa chỉ" />
            ),
            cell: ({ row }) => (
                <span className="text-muted-foreground max-w-xs truncate block">
                    {row.getValue('address') || '—'}
                </span>
            ),
        },
        {
            accessorKey: 'keywords',
            header: 'Từ khóa',
            cell: ({ row }) => {
                const keywords = row.getValue('keywords') as string
                if (!keywords) return <span className="text-muted-foreground">—</span>
                return (
                    <div className="flex gap-1 flex-wrap">
                        {keywords.split(',').slice(0, 3).map((k, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                                {k.trim()}
                            </Badge>
                        ))}
                    </div>
                )
            },
            enableSorting: false,
        },
        {
            id: 'actions',
            header: 'Thao tác',
            cell: ({ row }) => {
                const location = row.original
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Mở menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(location)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Chỉnh sửa
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => onDelete(location.id)}
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
