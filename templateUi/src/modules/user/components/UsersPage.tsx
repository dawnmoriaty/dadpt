import { UserPlus } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { DataTable, DataTableViewOptions } from '@/components/common/data-table'
import { Button } from '@/components/ui/button'

import { useUsers, useDeleteUser, useCreateUser, useUpdateUser } from '../hooks'
import type { User, CreateUserRequest, UpdateUserRequest } from '../types'

import { getUsersColumns } from './users-columns'
import { UserFormDialog } from './UserFormDialog'

export function UsersPage(): React.ReactElement {
    const [page, setPage] = useState(0)
    const [pageSize, setPageSize] = useState(20)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [deletingUserId, setDeletingUserId] = useState<number | null>(null)

    const { data, isLoading, error } = useUsers(page + 1, pageSize)
    const deleteMutation = useDeleteUser()
    const createMutation = useCreateUser()
    const updateMutation = useUpdateUser()

    const columns = useMemo(
        () =>
            getUsersColumns({
                onEdit: (user) => {
                    setEditingUser(user)
                    setIsFormOpen(true)
                },
                onDelete: setDeletingUserId,
            }),
        [],
    )

    const handleCreate = (): void => {
        setEditingUser(null)
        setIsFormOpen(true)
    }

    const handleConfirmDelete = (): void => {
        if (deletingUserId !== null) {
            deleteMutation.mutate(deletingUserId, {
                onSettled: () => setDeletingUserId(null),
            })
        }
    }

    const handleSubmit = (data: CreateUserRequest | UpdateUserRequest): void => {
        if (editingUser) {
            updateMutation.mutate(
                { id: editingUser.id, data: data as UpdateUserRequest },
                { onSuccess: () => setIsFormOpen(false) },
            )
        } else {
            createMutation.mutate(data as CreateUserRequest, {
                onSuccess: () => setIsFormOpen(false),
            })
        }
    }

    if (error) {
        return <div className="text-destructive">Error loading users</div>
    }

    const users = data?.items ?? []
    const totalPages = data?.total ? Math.ceil(data.total / pageSize) : 0

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Users</h1>
                    <p className="text-muted-foreground">Manage system users and their roles</p>
                </div>
                <Button onClick={handleCreate}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add User
                </Button>
            </div>

            <DataTable
                columns={columns}
                data={users}
                pageCount={totalPages}
                pageIndex={page}
                pageSize={pageSize}
                onPaginationChange={(newPage, newSize) => {
                    setPage(newPage)
                    setPageSize(newSize)
                }}
                isLoading={isLoading}
                toolbar={(table) => (
                    <div className="flex items-center justify-end">
                        <DataTableViewOptions table={table} />
                    </div>
                )}
            />

            <UserFormDialog
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleSubmit}
                user={editingUser}
                isLoading={createMutation.isPending || updateMutation.isPending}
            />

            <ConfirmDialog
                open={deletingUserId !== null}
                onOpenChange={() => setDeletingUserId(null)}
                onConfirm={handleConfirmDelete}
                title="Delete User"
                description="Are you sure you want to delete this user? This action cannot be undone."
                variant="destructive"
                loading={deleteMutation.isPending}
            />
        </div>
    )
}
