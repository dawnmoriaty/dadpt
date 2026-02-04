import { createFileRoute, redirect, useSearch } from '@tanstack/react-router'
import * as z from 'zod'

import { canAccessAdmin, getAuthState, LoginForm } from '@/modules/auth'

const loginSearchSchema = z.object({
    redirect: z.string().optional(),
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
    component: LoginPage,
})

function LoginPage() {
    const search = useSearch({ from: '/_auth/login' })
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
            <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-8 shadow-lg">
                <div className="text-center">
                    <h1 className="text-2xl font-bold">Welcome Back</h1>
                    <p className="text-gray-500">Login to your account</p>
                </div>
                <LoginForm redirectTo={search.redirect} />
            </div>
        </div>
    )
}
