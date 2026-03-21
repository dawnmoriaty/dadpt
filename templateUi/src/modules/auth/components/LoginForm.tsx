import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

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
    const { t } = useTranslation()

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
                            <FormLabel>{t('authPage.loginLabel')}</FormLabel>
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
                            <FormLabel>{t('authPage.passwordLabel')}</FormLabel>
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
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 font-medium">
                        <span className="block">❌ Đăng nhập thất bại</span>
                        <span className="text-xs text-red-600 mt-1">{loginMutation.error.message}</span>
                    </div>
                )}

                <Button 
                    type="submit" 
                    className="w-full h-11 font-bold rounded-lg border-2 text-gray-900 active:scale-95 transition-all duration-300"
                    style={{
                        backgroundColor: '#FFF541',
                        borderColor: '#FFE81C',
                        color: '#1F2937'
                    }}
                    disabled={loginMutation.isPending}
                    onMouseEnter={(e) => {
                        if (!loginMutation.isPending) {
                            e.currentTarget.style.backgroundColor = '#FFED4F'
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFF541'
                    }}
                >
                    {loginMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {t('authPage.loginBtn')}
                </Button>
            </form>
        </Form>
    )
}
