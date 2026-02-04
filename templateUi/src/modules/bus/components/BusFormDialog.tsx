import { Upload, X } from 'lucide-react'
import { useState } from 'react'


import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useBusTypes } from '@/modules/bustype'
import { useProviders } from '@/modules/provider/hooks'
import { useUploadImage } from '@/modules/upload'

import type { Bus, CreateBusRequest, UpdateBusRequest } from '../types'

interface BusFormDialogProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: CreateBusRequest | UpdateBusRequest) => void
    bus?: Bus | null
    isLoading?: boolean
}

export function BusFormDialog({
    isOpen,
    onClose,
    onSubmit,
    bus,
    isLoading,
}: BusFormDialogProps): React.ReactElement {
    const isEditing = !!bus
    const [imageUrl, setImageUrl] = useState<string>(bus?.imageUrl ?? '')



    const { data: providers } = useProviders({ page: 1, pageSize: 100 })
    const { data: busTypes } = useBusTypes(1, 100)
    const uploadMutation = useUploadImage()

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = e.target.files?.[0]
        if (!file) return

        uploadMutation.mutate(
            { file, folder: 'buses' },
            {
                onSuccess: (data) => {
                    setImageUrl(data.url)
                },
            }
        )
    }

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        if (isEditing) {
            const data: UpdateBusRequest = {
                busTypeId: Number(formData.get('busTypeId')) || undefined,
                licensePlate: formData.get('licensePlate') as string || undefined,
                status: formData.get('status') as UpdateBusRequest['status'] || undefined,
                imageUrl: imageUrl,
            }
            onSubmit(data)
        } else {
            const data: CreateBusRequest = {
                providerId: Number(formData.get('providerId')),
                busTypeId: Number(formData.get('busTypeId')),
                licensePlate: formData.get('licensePlate') as string,
                imageUrl: imageUrl || undefined,
            }
            onSubmit(data)
        }
    }

    const providerItems = providers?.items ?? []
    const busTypeItems = busTypes?.items ?? []

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Edit Bus' : 'Create Bus'}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Image Upload */}
                    <div>
                        <Label>Bus Image</Label>
                        <div className="mt-2">
                            {imageUrl ? (
                                <div className="relative inline-block">
                                    <img
                                        src={imageUrl}
                                        alt="Bus preview"
                                        className="w-32 h-32 object-cover rounded"
                                    />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute -top-2 -right-2 h-6 w-6"
                                        onClick={() => setImageUrl('')}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                                    <Upload className="w-8 h-8 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground mt-2">Upload</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => void handleImageUpload(e)}
                                        disabled={uploadMutation.isPending}
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Provider - only for create */}
                    {!isEditing && (
                        <div>
                            <Label htmlFor="providerId">Provider</Label>
                            <select
                                id="providerId"
                                name="providerId"
                                required
                                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                            >
                                <option value="">Select provider...</option>
                                {providerItems.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Bus Type */}
                    <div>
                        <Label htmlFor="busTypeId">Bus Type</Label>
                        <select
                            id="busTypeId"
                            name="busTypeId"
                            required={!isEditing}
                            defaultValue={bus?.busTypeId ?? ''}
                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        >
                            <option value="">Select bus type...</option>
                            {busTypeItems.map((bt) => (
                                <option key={bt.id} value={bt.id}>
                                    {bt.name} ({bt.totalSeats} seats)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* License Plate */}
                    <div>
                        <Label htmlFor="licensePlate">License Plate</Label>
                        <Input
                            id="licensePlate"
                            name="licensePlate"
                            placeholder="e.g. 51B-123.45"
                            defaultValue={bus?.licensePlate ?? ''}
                            required={!isEditing}
                        />
                    </div>

                    {/* Status - only for edit */}
                    {isEditing && (
                        <div>
                            <Label htmlFor="status">Status</Label>
                            <select
                                id="status"
                                name="status"
                                defaultValue={bus?.status ?? 'active'}
                                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                            >
                                <option value="active">Active</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="retired">Retired</option>
                            </select>
                        </div>
                    )}

                    <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading || uploadMutation.isPending}>
                            {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
