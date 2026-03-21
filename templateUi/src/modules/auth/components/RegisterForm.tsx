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

import { useRegister } from '../hooks'
import { registerSchema, type RegisterFormData } from '../schemas'

interface RegisterFormProps {
    onSuccess?: () => void
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
    const registerMutation = useRegister()
    const { t } = useTranslation()

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
                            <FormLabel>{t('authPage.registerFullName')}</FormLabel>
                            <FormControl>
                                <Input 
                                    placeholder="Nguyễn Văn A" 
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
                                <FormLabel>{t('authPage.registerPhone')}</FormLabel>
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
                                <FormLabel>{t('authPage.registerUsername')}</FormLabel>
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
                            <FormLabel>{t('authPage.registerEmail')}</FormLabel>
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
                            <FormLabel>{t('authPage.registerPassword')}</FormLabel>
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
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 font-medium">
                        <span className="block">❌ Đăng ký thất bại</span>
                        <span className="text-xs text-red-600 mt-1">{registerMutation.error.message}</span>
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
                    disabled={registerMutation.isPending}
                    onMouseEnter={(e) => {
                        if (!registerMutation.isPending) {
                            e.currentTarget.style.backgroundColor = '#FFED4F'
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFF541'
                    }}
                >
                    {registerMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {t('authPage.registerBtn')}
                </Button>
            </form>
        </Form>
    )
}
