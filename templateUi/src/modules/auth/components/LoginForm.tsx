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

import { useLogin } from '../hooks'
import { loginSchema, type LoginFormData } from '../schemas'

interface LoginFormProps {
    redirectTo?: string
    onSuccess?: () => void
}

export function LoginForm({ redirectTo, onSuccess }: LoginFormProps) {
    const loginMutation = useLogin(redirectTo)

    const form = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            identifier: '',
            password: '',
        },
    })

    function onSubmit(values: LoginFormData) {
        loginMutation.mutate(values, {
            onSuccess: () => onSuccess?.(),
        })
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="identifier"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Số điện thoại hoặc tên đăng nhập</FormLabel>
                            <FormControl>
                                <Input 
                                    placeholder="0987..." 
                                    autoComplete="username"
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
                            <FormLabel>Mật khẩu</FormLabel>
                            <FormControl>
                                <Input 
                                    type="password" 
                                    autoComplete="current-password"
                                    {...field} 
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {loginMutation.error !== null && (
                    <p className="text-sm text-red-500 font-medium">
                        {loginMutation.error.message}
                    </p>
                )}

                <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loginMutation.isPending}
                >
                    {loginMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Đăng nhập
                </Button>
            </form>
        </Form>
    )
}
