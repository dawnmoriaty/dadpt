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

import { createLocationSchema, type CreateLocationFormData } from '../schemas'
import type { Location } from '../types'

interface LocationFormProps {
    location?: Location | null
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: { name: string; city: string; address: string; keywords: string }) => void
    isLoading?: boolean
}

export function LocationForm({ location, isOpen, onClose, onSubmit, isLoading }: LocationFormProps) {
    const form = useForm<CreateLocationFormData>({
        resolver: zodResolver(createLocationSchema),
        defaultValues: {
            name: location?.name ?? '',
            city: location?.city ?? '',
            address: location?.address ?? '',
            keywords: location?.keywords ?? '',
        },
    })

    useEffect(() => {
        if (isOpen) {
            form.reset({
                name: location?.name ?? '',
                city: location?.city ?? '',
                address: location?.address ?? '',
                keywords: location?.keywords ?? '',
            })
        }
    }, [isOpen, location, form])

    const handleFormSubmit = (values: CreateLocationFormData): void => {
        onSubmit({
            name: values.name,
            city: values.city,
            address: values.address ?? '',
            keywords: values.keywords ?? '',
        })
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {location ? 'Edit Location' : 'Add New Location'}
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
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="city"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>City</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Address</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="keywords"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Keywords</FormLabel>
                                    <FormControl>
                                        <Input placeholder="comma-separated" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {location ? 'Update' : 'Create'} Location
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
