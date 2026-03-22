import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Power } from 'lucide-react'

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

import type { Provider } from '../types'

interface ProvidersColumnsOptions {
    onEdit: (provider: Provider) => void
    onToggleActive: (id: number) => void
    onDelete: (id: number) => void
}

export function getProvidersColumns({
    onEdit,
    onToggleActive,
    onDelete,
}: ProvidersColumnsOptions): ColumnDef<Provider>[] {
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
                    className="translate-y-0.5"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Chọn hàng"
                    className="translate-y-0.5"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Nhà xe" />
            ),
            cell: ({ row }) => {
                const provider = row.original
                return (
                    <div className="flex items-center gap-3">
                        {provider.imageUrl ? (
                            <OptimizedImage
                                src={provider.imageUrl}
                                alt={provider.name}
                                width={40}
                                height={40}
                                className="rounded-xl"
                                objectFit="cover"
                            />
                        ) : (
                            <div
                                className={`h-10 w-10 rounded-xl flex items-center justify-center text-white font-semibold ${
                                    provider.isActive
                                        ? 'bg-linear-to-br from-violet-500 to-purple-600'
                                        : 'bg-gray-400'
                                }`}
                            >
                                {provider.name.substring(0, 2).toUpperCase()}
                            </div>
                        )}
                        <span className="font-medium">{provider.name}</span>
                    </div>
                )
            },
        },
        {
            accessorKey: 'isActive',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Trạng thái" />
            ),
            cell: ({ row }) => {
                const isActive = row.getValue('isActive') as boolean
                return (
                    <Badge variant={isActive ? 'success' : 'secondary'} className="gap-1">
                        <span
                            className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-gray-400'}`}
                        />
                        {isActive ? 'Hoạt động' : 'Ngưng hoạt động'}
                    </Badge>
                )
            },
        },
        {
            accessorKey: 'hotline',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Hotline" />
            ),
            cell: ({ row }) => (
                <span className="text-muted-foreground">
                    {row.getValue('hotline') || '—'}
                </span>
            ),
        },
        {
            accessorKey: 'slug',
            header: 'Slug',
            cell: ({ row }) => (
                <code className="text-xs bg-muted px-2 py-1 rounded">
                    /{row.getValue('slug')}
                </code>
            ),
        },
        {
            id: 'actions',
            header: 'Thao tác',
            cell: ({ row }) => {
                const provider = row.original
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Mở menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onToggleActive(provider.id)}>
                                <Power className="h-4 w-4 mr-2" />
                                {provider.isActive ? 'Ngừng hoạt động' : 'Kích hoạt'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(provider)}>
                                Chỉnh sửa nhà xe
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => onDelete(provider.id)}
                                disabled={provider.isActive}
                            >
                                Xóa nhà xe
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
