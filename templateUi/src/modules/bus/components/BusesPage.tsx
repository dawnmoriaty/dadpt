import { PlusCircle } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { DataTable, DataTableViewOptions } from '@/components/common/data-table'
import { Button } from '@/components/ui/button'

import { useBuses, useDeleteBus, useCreateBus, useUpdateBus } from '../hooks'
import type { Bus, CreateBusRequest, UpdateBusRequest } from '../types'

import { getBusesColumns } from './buses-columns'
import { BusFormDialog } from './BusFormDialog'


export function BusesPage(): React.ReactElement {
    const [page, setPage] = useState(0)
    const [pageSize, setPageSize] = useState(20)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingBus, setEditingBus] = useState<Bus | null>(null)
    const [deletingBusId, setDeletingBusId] = useState<number | null>(null)
    
    const { data, error } = useBuses(page + 1, pageSize)
    const deleteMutation = useDeleteBus()
    const createMutation = useCreateBus()
    const updateMutation = useUpdateBus()

    const columns = useMemo(
        () =>
            getBusesColumns({
                onEdit: (bus) => {
                    setEditingBus(bus)
                    setIsFormOpen(true)
                },
                onDelete: setDeletingBusId,
            }),
        [],
    )

    const handleCreate = (): void => {
        setEditingBus(null)
        setIsFormOpen(true)
    }

    const handleConfirmDelete = (): void => {
        if (deletingBusId !== null) {
            deleteMutation.mutate(deletingBusId, {
                onSettled: () => setDeletingBusId(null),
            })
        }
    }

    const handleSubmit = (data: CreateBusRequest | UpdateBusRequest): void => {
        if (editingBus) {
            updateMutation.mutate(
                { id: editingBus.id, data: data as UpdateBusRequest },
                { onSuccess: () => setIsFormOpen(false) },
            )
        } else {
            createMutation.mutate(data as CreateBusRequest, {
                onSuccess: () => setIsFormOpen(false),
            })
        }
    }

    if (error) {
        return <div className="text-destructive">Không thể tải danh sách xe</div>
    }

    const buses = data?.items ?? []
    const totalPages = data?.total ? Math.ceil(data.total / pageSize) : 0

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Xe</h1>
                    <p className="text-muted-foreground">Quản lý đội xe gồm {data?.total ?? 0} xe</p>
                </div>
                <Button onClick={handleCreate}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Thêm xe
                </Button>
            </div>

            <DataTable
                columns={columns}
                data={buses}
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

            <BusFormDialog
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleSubmit}
                bus={editingBus}
                isLoading={createMutation.isPending || updateMutation.isPending}
            />

            <ConfirmDialog
                open={deletingBusId !== null}
                onOpenChange={() => setDeletingBusId(null)}
                onConfirm={handleConfirmDelete}
                title="Xóa xe"
                description="Bạn có chắc chắn muốn xóa xe này? Hành động này không thể hoàn tác."
                variant="destructive"
                loading={deleteMutation.isPending}
            />
        </div>
    )
}
