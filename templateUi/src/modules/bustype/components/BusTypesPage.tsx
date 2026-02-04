import { PlusCircle, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

import { useBusTypes, useDeleteBusType, useCreateBusType, useUpdateBusType } from '../hooks'
import type { BusType, CreateBusTypeRequest, UpdateBusTypeRequest } from '../types'

import { BusTypeFormDialog } from './BusTypeFormDialog'


export function BusTypesPage(): React.ReactElement {
    const [page] = useState(1)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingBusType, setEditingBusType] = useState<BusType | null>(null)
    
    const { data, isLoading, error } = useBusTypes(page, 20)
    const deleteMutation = useDeleteBusType()
    const createMutation = useCreateBusType()
    const updateMutation = useUpdateBusType()

    const handleCreate = (): void => {
        setEditingBusType(null)
        setIsFormOpen(true)
    }

    const handleEdit = (busType: BusType): void => {
        setEditingBusType(busType)
        setIsFormOpen(true)
    }

    const handleDelete = (id: number): void => {
        if (confirm('Are you sure you want to delete this bus type?')) {
            deleteMutation.mutate(id, {
                onSuccess: () => toast.success('Bus type deleted'),
                onError: (err) => {
                    toast.error('Failed to delete bus type')
                    console.error(err)
                },
            })
        }
    }

    const handleSubmit = (data: CreateBusTypeRequest | UpdateBusTypeRequest): void => {
        if (editingBusType) {
            updateMutation.mutate(
                { id: editingBusType.id, data: data as UpdateBusTypeRequest },
                {
                    onSuccess: () => {
                        toast.success('Bus type updated')
                        setIsFormOpen(false)
                    },
                    onError: (err) => {
                        toast.error('Failed to update bus type')
                        console.error(err)
                    },
                }
            )
        } else {
            createMutation.mutate(data as CreateBusTypeRequest, {
                onSuccess: () => {
                    toast.success('Bus type created')
                    setIsFormOpen(false)
                },
                onError: (err) => {
                    toast.error('Failed to create bus type')
                    console.error(err)
                },
            })
        }
    }

    if (error) {
        return <div className="text-destructive">Error loading bus types</div>
    }

    const busTypes = data?.items ?? []

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

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Total Seats</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : busTypes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    No bus types found
                                </TableCell>
                            </TableRow>
                        ) : (
                            busTypes.map((bt) => (
                                <TableRow key={bt.id}>
                                    <TableCell className="font-medium">{bt.id}</TableCell>
                                    <TableCell>{bt.name}</TableCell>
                                    <TableCell>{bt.totalSeats}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEdit(bt)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(bt.id)}
                                                disabled={deleteMutation.isPending}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <BusTypeFormDialog
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleSubmit}
                busType={editingBusType}
                isLoading={createMutation.isPending || updateMutation.isPending}
            />
        </div>
    )
}
