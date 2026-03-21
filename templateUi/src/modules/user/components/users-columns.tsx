import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Pencil, Trash2, User as UserIcon } from 'lucide-react'

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

import type { User } from '../types'

interface UsersColumnsOptions {
    onEdit: (user: User) => void
    onDelete: (id: number) => void
}

export function getUsersColumns({ onEdit, onDelete }: UsersColumnsOptions): ColumnDef<User>[] {
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
            accessorKey: 'username',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Tên đăng nhập" />
            ),
            cell: ({ row }) => {
                const user = row.original
                return (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{user.username}</span>
                    </div>
                )
            },
        },
        {
            accessorKey: 'fullName',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Họ và tên" />
            ),
        },
        {
            accessorKey: 'email',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Email" />
            ),
        },
        {
            accessorKey: 'phone',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Số điện thoại" />
            ),
        },
        {
            accessorKey: 'role',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Vai trò" />
            ),
            cell: ({ row }) => {
                const role = row.getValue('role') as string
                const roleLabel =
                    role === 'admin'
                        ? 'Quản trị viên'
                        : role === 'operator'
                            ? 'Điều hành'
                            : role === 'customer'
                                ? 'Khách hàng'
                                : role
                return (
                    <Badge variant={role === 'admin' ? 'default' : 'secondary'}>
                        {roleLabel}
                    </Badge>
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
                    <Badge variant={isActive ? 'success' : 'destructive'}>
                        {isActive ? 'Hoạt động' : 'Ngưng hoạt động'}
                    </Badge>
                )
            },
        },
        {
            id: 'actions',
            header: 'Thao tác',
            cell: ({ row }) => {
                const user = row.original
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Mở menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(user)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Chỉnh sửa
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => onDelete(user.id)}
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
