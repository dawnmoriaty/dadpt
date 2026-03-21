import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

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

import { createBusTypeSchema } from '../schemas'
import type { BusType, CreateBusTypeRequest, UpdateBusTypeRequest } from '../types'

type BusTypeFormInput = z.input<typeof createBusTypeSchema>
type BusTypeFormOutput = z.output<typeof createBusTypeSchema>

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

    const form = useForm<BusTypeFormInput, unknown, BusTypeFormOutput>({
        resolver: zodResolver(createBusTypeSchema),
        defaultValues: {
            name: busType?.name ?? '',
            totalSeats: busType?.totalSeats ?? 40,
            seatLayout: busType?.seatLayout ?? {},
        },
    })

    useEffect(() => {
        if (isOpen) {
            form.reset({
                name: busType?.name ?? '',
                totalSeats: busType?.totalSeats ?? 40,
                seatLayout: busType?.seatLayout ?? {},
            })
        }
    }, [isOpen, busType, form])

    const handleFormSubmit = (values: BusTypeFormOutput): void => {
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
                        {isEditing ? 'Chỉnh sửa loại xe' : 'Tạo loại xe'}
                    </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tên loại xe</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ví dụ: Giường nằm 40 chỗ" {...field} />
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
                                    <FormLabel>Tổng số ghế</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={100}
                                            value={field.value}
                                            onChange={(event) => field.onChange(Number(event.target.value) || 0)}
                                            onBlur={field.onBlur}
                                            name={field.name}
                                            ref={field.ref}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex gap-2 justify-end">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Hủy
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditing ? 'Cập nhật' : 'Tạo mới'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
