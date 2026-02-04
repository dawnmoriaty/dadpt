import { PlusCircle, Pencil, Trash2, Image } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

import { useBuses, useDeleteBus, useCreateBus, useUpdateBus } from '../hooks'
import type { Bus, CreateBusRequest, UpdateBusRequest } from '../types'

import { BusFormDialog } from './BusFormDialog'


const statusColors: Record<string, string> = {
    active: 'bg-green-500/10 text-green-500 border-green-500/20',
    maintenance: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    retired: 'bg-red-500/10 text-red-500 border-red-500/20',
}

export function BusesPage(): React.ReactElement {
    const [page] = useState(1)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingBus, setEditingBus] = useState<Bus | null>(null)
    
    const { data, isLoading, error } = useBuses(page, 20)
    const deleteMutation = useDeleteBus()
    const createMutation = useCreateBus()
    const updateMutation = useUpdateBus()

    const handleCreate = (): void => {
        setEditingBus(null)
        setIsFormOpen(true)
    }

    const handleEdit = (bus: Bus): void => {
        setEditingBus(bus)
        setIsFormOpen(true)
    }

    const handleDelete = (id: number): void => {
        if (confirm('Are you sure you want to delete this bus?')) {
            deleteMutation.mutate(id, {
                onSuccess: () => toast.success('Bus deleted'),
                onError: (err) => {
                    toast.error('Failed to delete bus')
                    console.error(err)
                },
            })
        }
    }

    const handleSubmit = (data: CreateBusRequest | UpdateBusRequest): void => {
        if (editingBus) {
            updateMutation.mutate(
                { id: editingBus.id, data: data as UpdateBusRequest },
                {
                    onSuccess: () => {
                        toast.success('Bus updated')
                        setIsFormOpen(false)
                    },
                    onError: (err) => {
                        toast.error('Failed to update bus')
                        console.error(err)
                    },
                }
            )
        } else {
            createMutation.mutate(data as CreateBusRequest, {
                onSuccess: () => {
                    toast.success('Bus created')
                    setIsFormOpen(false)
                },
                onError: (err) => {
                    toast.error('Failed to create bus')
                    console.error(err)
                },
            })
        }
    }

    if (error) {
        return <div className="text-destructive">Error loading buses</div>
    }

    const buses = data?.items ?? []

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Buses</h1>
                    <p className="text-muted-foreground">Manage your fleet of buses</p>
                </div>
                <Button onClick={handleCreate}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Bus
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-16">Image</TableHead>
                            <TableHead>License Plate</TableHead>
                            <TableHead>Provider</TableHead>
                            <TableHead>Bus Type</TableHead>
                            <TableHead>Seats</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : buses.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    No buses found
                                </TableCell>
                            </TableRow>
                        ) : (
                            buses.map((bus) => (
                                <TableRow key={bus.id}>
                                    <TableCell>
                                        {bus.imageUrl ? (
                                            <img
                                                src={bus.imageUrl}
                                                alt={bus.licensePlate}
                                                className="w-12 h-12 object-cover rounded"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                                                <Image className="w-6 h-6 text-muted-foreground" />
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium">{bus.licensePlate}</TableCell>
                                    <TableCell>{bus.providerName}</TableCell>
                                    <TableCell>{bus.busTypeName}</TableCell>
                                    <TableCell>{bus.totalSeats}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={statusColors[bus.status]}>
                                            {bus.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEdit(bus)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(bus.id)}
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

            <BusFormDialog
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleSubmit}
                bus={editingBus}
                isLoading={createMutation.isPending || updateMutation.isPending}
            />
        </div>
    )
}
