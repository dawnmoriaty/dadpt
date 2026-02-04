import { createFileRoute, redirect } from '@tanstack/react-router'
import * as z from 'zod'

import { canAccessAdmin, getAuthState, RegisterForm } from '@/modules/auth'

const registerSearchSchema = z.object({})

export const Route = createFileRoute('/_auth/register')({
    validateSearch: registerSearchSchema,
    beforeLoad: () => {
        const { isAuthenticated, user } = getAuthState()
        if (isAuthenticated && user !== null) {
            const redirectTo = canAccessAdmin(user.role) ? '/admin/dashboard' : '/'
            throw redirect({ to: redirectTo })
        }
    },
    component: RegisterPage,
})

function RegisterPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
            <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-8 shadow-lg">
                <div className="text-center">
                    <h1 className="text-2xl font-bold">Create Account</h1>
                    <p className="text-gray-500">Register a new account</p>
                </div>
                <RegisterForm />
            </div>
        </div>
    )
}
