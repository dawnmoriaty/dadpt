import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Upload, X } from 'lucide-react'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { OptimizedImage } from '@/components/common/optimized-image'
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
import { useUploadImage } from '@/modules/upload'

import { createProviderSchema, type CreateProviderFormData } from '../schemas'
import type { Provider } from '../types'

interface ProviderFormProps {
    provider?: Provider | null
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: { name: string; hotline: string; slug: string; policyRefund: string; imageUrl?: string }) => void
    isLoading?: boolean
}

export function ProviderForm({ provider, isOpen, onClose, onSubmit, isLoading }: ProviderFormProps) {
    const uploadMutation = useUploadImage()
    const form = useForm<CreateProviderFormData>({
        resolver: zodResolver(createProviderSchema),
        defaultValues: {
            name: provider?.name ?? '',
            hotline: provider?.hotline ?? '',
            slug: provider?.slug ?? '',
            policyRefund: provider?.policyRefund ?? '',
            imageUrl: provider?.imageUrl ?? '',
        },
    })

    const imageUrl = useWatch({ control: form.control, name: 'imageUrl' })

    useEffect(() => {
        if (isOpen) {
            form.reset({
                name: provider?.name ?? '',
                hotline: provider?.hotline ?? '',
                slug: provider?.slug ?? '',
                policyRefund: provider?.policyRefund ?? '',
                imageUrl: provider?.imageUrl ?? '',
            })
        }
    }, [isOpen, provider, form])

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0]
        if (!file) return
        uploadMutation.mutate(
            { file, folder: 'providers' },
            { onSuccess: (data) => form.setValue('imageUrl', data.url) },
        )
    }

    const handleFormSubmit = (values: CreateProviderFormData): void => {
        onSubmit({
            name: values.name,
            hotline: values.hotline ?? '',
            slug: values.slug ?? '',
            policyRefund: values.policyRefund ?? '',
            imageUrl: imageUrl || undefined,
        })
    }

    const isPending = isLoading || uploadMutation.isPending

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {provider ? 'Edit Provider' : 'Add New Provider'}
                    </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                        {/* Image Upload */}
                        <div>
                            <p className="text-sm font-medium mb-2">Provider Image</p>
                            {imageUrl ? (
                                <div className="relative inline-block">
                                    <OptimizedImage
                                        src={imageUrl}
                                        alt="Provider preview"
                                        width={128}
                                        height={128}
                                        className="rounded"
                                        objectFit="cover"
                                    />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute -top-2 -right-2 h-6 w-6"
                                        onClick={() => form.setValue('imageUrl', '')}
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

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="hotline"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Hotline</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="slug"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Slug</FormLabel>
                                    <FormControl>
                                        <Input placeholder="auto-generated if empty" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="policyRefund"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Refund Policy</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {provider ? 'Update' : 'Create'} Provider
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
