import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

import { useRegister } from '../hooks'
import { registerSchema, type RegisterFormData } from '../schemas'

interface RegisterFormProps {
    onSuccess?: () => void
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
    const registerMutation = useRegister()

    const form = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            fullName: '',
            username: '',
            phone: '',
            email: '',
            password: '',
        },
    })

    function onSubmit(values: RegisterFormData) {
        registerMutation.mutate(values, {
            onSuccess: () => onSuccess?.(),
        })
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                                <Input 
                                    placeholder="Nguyen Van A" 
                                    autoComplete="name"
                                    {...field} 
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Phone</FormLabel>
                                <FormControl>
                                    <Input 
                                        placeholder="0912345678" 
                                        autoComplete="tel"
                                        {...field} 
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                    <Input 
                                        placeholder="nguyenvana" 
                                        autoComplete="username"
                                        {...field} 
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email (Optional)</FormLabel>
                            <FormControl>
                                <Input 
                                    type="email" 
                                    placeholder="email@example.com" 
                                    autoComplete="email"
                                    {...field} 
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <Input 
                                    type="password" 
                                    autoComplete="new-password"
                                    {...field} 
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {registerMutation.error !== null && (
                    <p className="text-sm text-red-500 font-medium">
                        {registerMutation.error.message}
                    </p>
                )}

                <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={registerMutation.isPending}
                >
                    {registerMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Register Account
                </Button>
            </form>
        </Form>
    )
}
