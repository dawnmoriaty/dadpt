import { createFileRoute, Link, redirect, useNavigate, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as z from 'zod'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { canAccessAdmin, getAuthState, LoginForm, RegisterForm } from '@/modules/auth'

const loginSearchSchema = z.object({
    redirect: z.string().optional(),
    tab: z.enum(['login', 'register']).optional().default('login'),
})

export const Route = createFileRoute('/_auth/login')({
    validateSearch: loginSearchSchema,
    beforeLoad: ({ search }) => {
        const { isAuthenticated, user } = getAuthState()
        if (isAuthenticated && user !== null) {
            const redirectTo = search.redirect ?? (canAccessAdmin(user.role) ? '/admin/dashboard' : '/')
            throw redirect({ to: redirectTo })
        }
    },
    component: AuthPage,
})

function AuthPage() {
    const search = useSearch({ from: '/_auth/login' })
    const logoSrc = `${import.meta.env.BASE_URL}LOGOBUS.png`
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [tab, setTab] = useState<'login' | 'register'>(search.tab ?? 'login')

    const handleSuccess = () => {
        const redirectTo = search.redirect ?? '/'
        navigate({ to: redirectTo })
    }

    return (
        <div className="flex min-h-screen">
            {/* Left panel — image + branding */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-primary overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: 'url("https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=2069&auto=format&fit=crop")',
                        filter: 'brightness(0.35)',
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-primary/40" />
                <div className="relative z-10 flex flex-col justify-between p-12 text-white">
                    <Link to="/" className="flex items-center gap-3">
                        <img src={logoSrc} alt="Dat Ve Xe logo" className="h-8 w-8 rounded-lg object-cover" />
                        <span className="text-2xl font-bold">{t('nav.brand')}</span>
                    </Link>

                    <div className="space-y-6">
                        <h1 className="text-4xl font-extrabold leading-tight">
                            {t('home.heroTitle')}
                        </h1>
                        <p className="text-lg text-white/80 max-w-md">
                            {t('home.heroSubtitle')}
                        </p>
                        <div className="flex gap-8 pt-4">
                            <div>
                                <p className="text-3xl font-bold">2000+</p>
                                <p className="text-sm text-white/60">{t('home.statTrips')}</p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold">150+</p>
                                <p className="text-sm text-white/60">{t('home.statProviders')}</p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold">100K+</p>
                                <p className="text-sm text-white/60">{t('home.statCustomers')}</p>
                            </div>
                        </div>
                    </div>

                    <p className="text-sm text-white/50">
                        &copy; 2025 {t('nav.brand')}
                    </p>
                </div>
            </div>

            {/* Right panel — form */}
            <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12 bg-background">
                <div className="w-full max-w-md space-y-8">
                    {/* Mobile branding */}
                    <div className="lg:hidden flex items-center justify-center gap-2 mb-4">
                        <Link to="/" className="flex items-center gap-2 text-primary">
                            <img src={logoSrc} alt="Dat Ve Xe logo" className="h-6 w-6 rounded-md object-cover" />
                            <span className="text-xl font-bold">{t('nav.brand')}</span>
                        </Link>
                    </div>

                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight">
                            {tab === 'login' ? t('authPage.loginTitle') : t('authPage.registerTitle')}
                        </h2>
                        <p className="text-muted-foreground text-sm">
                            {tab === 'login' ? t('authPage.loginSubtitle') : t('authPage.registerSubtitle')}
                        </p>
                    </div>

                    <Tabs value={tab} onValueChange={(v) => setTab(v as 'login' | 'register')} className="space-y-6">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="login">{t('authPage.loginTab')}</TabsTrigger>
                            <TabsTrigger value="register">{t('authPage.registerTab')}</TabsTrigger>
                        </TabsList>
                        <TabsContent value="login">
                            <LoginForm redirectTo={search.redirect} onSuccess={handleSuccess} />
                        </TabsContent>
                        <TabsContent value="register">
                            <RegisterForm onSuccess={handleSuccess} />
                        </TabsContent>
                    </Tabs>

                    <div className="text-center">
                        <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            {t('authPage.backToHome')}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
