import { Loader2, Upload, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { formResolver } from '@/lib/form/resolver'
import { useBusTypes } from '@/modules/bustype'
import { useProviders } from '@/modules/provider/hooks'
import { useUploadImage } from '@/modules/upload'

import { createBusSchema, updateBusSchema, type CreateBusFormData, type UpdateBusFormData } from '../schemas'
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

    const { data: providers } = useProviders({ page: 1, pageSize: 100 })
    const { data: busTypes } = useBusTypes(1, 100)
    const uploadMutation = useUploadImage()
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    const createForm = useForm<CreateBusFormData>({
        resolver: formResolver(createBusSchema),
        defaultValues: {
            providerId: 0,
            busTypeId: 0,
            licensePlate: '',
            imageUrl: '',
        },
    })

    const updateForm = useForm<UpdateBusFormData>({
        resolver: formResolver(updateBusSchema),
        defaultValues: {
            busTypeId: bus?.busTypeId,
            licensePlate: bus?.licensePlate ?? '',
            status: bus?.status ?? 'active',
            imageUrl: bus?.imageUrl ?? '',
        },
    })

    const createImageUrl = useWatch({ control: createForm.control, name: 'imageUrl' })
    const updateImageUrl = useWatch({ control: updateForm.control, name: 'imageUrl' })
    const imageUrl = isEditing ? (updateImageUrl ?? '') : (createImageUrl ?? '')

    useEffect(() => {
        if (isOpen) {
            setPreviewUrl(null)
            if (bus) {
                updateForm.reset({
                    busTypeId: bus.busTypeId,
                    licensePlate: bus.licensePlate,
                    status: bus.status,
                    imageUrl: bus.imageUrl ?? '',
                })
            } else {
                createForm.reset({
                    providerId: 0,
                    busTypeId: 0,
                    licensePlate: '',
                    imageUrl: '',
                })
            }
        }
    }, [isOpen, bus, createForm, updateForm])

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0]
        if (!file) return

        // Instant local preview via FileReader
        const reader = new FileReader()
        reader.onload = (ev) => setPreviewUrl(ev.target?.result as string)
        reader.readAsDataURL(file)

        uploadMutation.mutate(
            { file, folder: 'buses' },
            {
                onSuccess: (data) => {
                    if (isEditing) {
                        updateForm.setValue('imageUrl', data.url)
                    } else {
                        createForm.setValue('imageUrl', data.url)
                    }
                },
            },
        )
    }

    const handleCreateSubmit = (values: CreateBusFormData): void => {
        onSubmit({ ...values, imageUrl: imageUrl || undefined })
    }

    const handleUpdateSubmit = (values: UpdateBusFormData): void => {
        onSubmit({ ...values, imageUrl: imageUrl || undefined })
    }

    const providerItems = providers?.items ?? []
    const busTypeItems = busTypes?.items ?? []
    const isPending = isLoading || uploadMutation.isPending

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Edit Bus' : 'Create Bus'}
                    </DialogTitle>
                </DialogHeader>

                {/* Image Upload (shared between create/edit) */}
                <div>
                    <p className="text-sm font-medium mb-2">Bus Image</p>
                    {(previewUrl || imageUrl) ? (
                        <div className="relative inline-block">
                            <img
                                src={previewUrl || imageUrl}
                                alt="Bus preview"
                                className="w-32 h-32 object-cover rounded"
                            />
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6"
                                onClick={() => {
                                    if (isEditing) {
                                        updateForm.setValue('imageUrl', '')
                                    } else {
                                        createForm.setValue('imageUrl', '')
                                    }
                                    setPreviewUrl(null)
                                }}
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
                                onChange={handleImageUpload}
                                disabled={uploadMutation.isPending}
                            />
                        </label>
                    )}
                </div>

                {isEditing ? (
                    <Form {...updateForm}>
                        <form onSubmit={updateForm.handleSubmit(handleUpdateSubmit)} className="space-y-4">
                            <FormField
                                control={updateForm.control}
                                name="busTypeId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Bus Type</FormLabel>
                                        <Select
                                            onValueChange={(val) => field.onChange(Number(val))}
                                            value={field.value?.toString() ?? ''}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select bus type..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {busTypeItems.map((bt) => (
                                                    <SelectItem key={bt.id} value={bt.id.toString()}>
                                                        {bt.name} ({bt.totalSeats} seats)
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={updateForm.control}
                                name="licensePlate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>License Plate</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. 51B-123.45" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={updateForm.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value ?? 'active'}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="maintenance">Maintenance</SelectItem>
                                                <SelectItem value="retired">Retired</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex gap-2 justify-end">
                                <Button type="button" variant="outline" onClick={onClose}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isPending}>
                                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Update
                                </Button>
                            </div>
                        </form>
                    </Form>
                ) : (
                    <Form {...createForm}>
                        <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
                            <FormField
                                control={createForm.control}
                                name="providerId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Provider</FormLabel>
                                        <Select
                                            onValueChange={(val) => field.onChange(Number(val))}
                                            value={field.value ? field.value.toString() : ''}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select provider..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {providerItems.map((p) => (
                                                    <SelectItem key={p.id} value={p.id.toString()}>
                                                        {p.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={createForm.control}
                                name="busTypeId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Bus Type</FormLabel>
                                        <Select
                                            onValueChange={(val) => field.onChange(Number(val))}
                                            value={field.value ? field.value.toString() : ''}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select bus type..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {busTypeItems.map((bt) => (
                                                    <SelectItem key={bt.id} value={bt.id.toString()}>
                                                        {bt.name} ({bt.totalSeats} seats)
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={createForm.control}
                                name="licensePlate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>License Plate</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. 51B-123.45" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex gap-2 justify-end">
                                <Button type="button" variant="outline" onClick={onClose}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isPending}>
                                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create
                                </Button>
                            </div>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    )
}
