import { createFileRoute, redirect } from '@tanstack/react-router'

import { LoginForm } from '@/features/auth/login-form'
import { useAuthStore } from '@/stores/use-auth-store'

export const Route = createFileRoute('/login')({
    beforeLoad: () => {
        const { isAuthenticated, isAdmin } = useAuthStore.getState()
        if (isAuthenticated) {
            throw redirect({ to: isAdmin ? '/dashboard' : '/' })
        }
    },
    component: LoginPage,
})

function LoginPage() {
    return (
        <div className="flex min-h-[80vh] items-center justify-center">
            <div className="w-full max-w-md space-y-6 px-4">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
                    <p className="mt-2 text-gray-600">Sign in to your account</p>
                </div>
                <div className="rounded-xl bg-white p-8 shadow-lg border border-gray-100">
                    <LoginForm />
                </div>
            </div>
        </div>
    )
}
