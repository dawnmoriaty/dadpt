import { PlusCircle } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { DataTable, DataTableViewOptions } from '@/components/common/data-table'
import { Button } from '@/components/ui/button'

import { useBusTypes, useDeleteBusType, useCreateBusType, useUpdateBusType } from '../hooks'
import type { BusType, CreateBusTypeRequest, UpdateBusTypeRequest } from '../types'

import { getBusTypesColumns } from './bus-types-columns'
import { BusTypeFormDialog } from './BusTypeFormDialog'


export function BusTypesPage(): React.ReactElement {
    const [page, setPage] = useState(0)
    const [pageSize, setPageSize] = useState(20)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingBusType, setEditingBusType] = useState<BusType | null>(null)
    const [deletingId, setDeletingId] = useState<number | null>(null)
    
    const { data, error } = useBusTypes(page + 1, pageSize)
    const deleteMutation = useDeleteBusType()
    const createMutation = useCreateBusType()
    const updateMutation = useUpdateBusType()

    const columns = useMemo(
        () =>
            getBusTypesColumns({
                onEdit: (busType) => {
                    setEditingBusType(busType)
                    setIsFormOpen(true)
                },
                onDelete: setDeletingId,
            }),
        [],
    )

    const handleCreate = (): void => {
        setEditingBusType(null)
        setIsFormOpen(true)
    }

    const handleConfirmDelete = (): void => {
        if (deletingId !== null) {
            deleteMutation.mutate(deletingId, {
                onSettled: () => setDeletingId(null),
            })
        }
    }

    const handleSubmit = (data: CreateBusTypeRequest | UpdateBusTypeRequest): void => {
        if (editingBusType) {
            updateMutation.mutate(
                { id: editingBusType.id, data: data as UpdateBusTypeRequest },
                { onSuccess: () => setIsFormOpen(false) },
            )
        } else {
            createMutation.mutate(data as CreateBusTypeRequest, {
                onSuccess: () => setIsFormOpen(false),
            })
        }
    }

    if (error) {
        return <div className="text-destructive">Error loading bus types</div>
    }

    const busTypes = data?.items ?? []
    const totalPages = data?.total ? Math.ceil(data.total / pageSize) : 0

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Bus Types</h1>
                    <p className="text-muted-foreground">Manage bus types and seat layouts</p>
                </div>
                <Button onClick={handleCreate}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Bus Type
                </Button>
            </div>

            <DataTable
                columns={columns}
                data={busTypes}
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

            <BusTypeFormDialog
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleSubmit}
                busType={editingBusType}
                isLoading={createMutation.isPending || updateMutation.isPending}
            />

            <ConfirmDialog
                open={deletingId !== null}
                onOpenChange={() => setDeletingId(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Bus Type"
                description="Are you sure you want to delete this bus type? This action cannot be undone."
                variant="destructive"
                loading={deleteMutation.isPending}
            />
        </div>
    )
}
