import { useEffect } from 'react'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

    useEffect(() => {
        // Reset form when dialog opens/closes
    }, [isOpen, busType])

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        if (isEditing && busType) {
            const data: UpdateBusTypeRequest = {
                name: formData.get('name') as string,
                totalSeats: Number(formData.get('totalSeats')),
                seatLayout: busType.seatLayout, // Preserve existing layout
            }
            onSubmit(data)
        } else {
            const data: CreateBusTypeRequest = {
                name: formData.get('name') as string,
                totalSeats: Number(formData.get('totalSeats')),
                seatLayout: {}, // Default empty layout for new
            }
            onSubmit(data)
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
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="e.g. Giường nằm 40 chỗ"
                            defaultValue={busType?.name ?? ''}
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="totalSeats">Total Seats</Label>
                        <Input
                            id="totalSeats"
                            name="totalSeats"
                            type="number"
                            min={1}
                            max={100}
                            defaultValue={busType?.totalSeats ?? 40}
                            required
                        />
                    </div>

                    <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
