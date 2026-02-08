import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

import { createBusTypeSchema, updateBusTypeSchema, type CreateBusTypeFormData, type UpdateBusTypeFormData } from '../schemas'
import type { BusType, CreateBusTypeRequest, UpdateBusTypeRequest } from '../types'

interface BusTypeFormDialogProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: CreateBusTypeRequest | UpdateBusTypeRequest) => void
    busType?: BusType | null
    isLoading?: boolean
}

export function BusTypeFormDialog({
    isOpen,
    onClose,
    onSubmit,
    busType,
    isLoading,
}: BusTypeFormDialogProps): React.ReactElement {
    const isEditing = !!busType

    const form = useForm<CreateBusTypeFormData | UpdateBusTypeFormData>({
        resolver: zodResolver(isEditing ? updateBusTypeSchema : createBusTypeSchema),
        defaultValues: {
            name: busType?.name ?? '',
            totalSeats: busType?.totalSeats ?? 40,
        },
    })

    useEffect(() => {
        if (isOpen) {
            form.reset({
                name: busType?.name ?? '',
                totalSeats: busType?.totalSeats ?? 40,
            })
        }
    }, [isOpen, busType, form])

    const handleFormSubmit = (values: CreateBusTypeFormData | UpdateBusTypeFormData): void => {
        if (isEditing && busType) {
            onSubmit({
                ...values,
                seatLayout: busType.seatLayout,
            } as UpdateBusTypeRequest)
        } else {
            onSubmit({
                ...values,
                seatLayout: {},
            } as CreateBusTypeRequest)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Edit Bus Type' : 'Create Bus Type'}
                    </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Giường nằm 40 chỗ" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="totalSeats"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Total Seats</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={100}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex gap-2 justify-end">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditing ? 'Update' : 'Create'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
