import { createFileRoute, redirect } from '@tanstack/react-router'

import { getAuthState, canAccessAdmin } from '@/modules/auth'

export const Route = createFileRoute('/_auth/register')({
    beforeLoad: () => {
        const { isAuthenticated, user } = getAuthState()
        if (isAuthenticated && user !== null) {
            const redirectTo = canAccessAdmin(user.role) ? '/admin/dashboard' : '/'
            throw redirect({ to: redirectTo })
        }
        // Redirect to unified auth page with register tab
        throw redirect({ to: '/login', search: { tab: 'register' } })
    },
    component: () => null,
})
