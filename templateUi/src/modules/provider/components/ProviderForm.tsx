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

import { createProviderSchema, type CreateProviderFormData } from '../schemas'
import type { Provider } from '../types'

interface ProviderFormProps {
    provider?: Provider | null
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: { name: string; hotline: string; slug: string; policyRefund: string }) => void
    isLoading?: boolean
}

export function ProviderForm({ provider, isOpen, onClose, onSubmit, isLoading }: ProviderFormProps) {
    const form = useForm<CreateProviderFormData>({
        resolver: zodResolver(createProviderSchema),
        defaultValues: {
            name: provider?.name ?? '',
            hotline: provider?.hotline ?? '',
            slug: provider?.slug ?? '',
            policyRefund: provider?.policyRefund ?? '',
        },
    })

    useEffect(() => {
        if (isOpen) {
            form.reset({
                name: provider?.name ?? '',
                hotline: provider?.hotline ?? '',
                slug: provider?.slug ?? '',
                policyRefund: provider?.policyRefund ?? '',
            })
        }
    }, [isOpen, provider, form])

    const handleFormSubmit = (values: CreateProviderFormData): void => {
        onSubmit({
            name: values.name,
            hotline: values.hotline ?? '',
            slug: values.slug ?? '',
            policyRefund: values.policyRefund ?? '',
        })
    }

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

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {provider ? 'Update' : 'Create'} Provider
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
