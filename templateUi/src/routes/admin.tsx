import { createFileRoute, redirect } from '@tanstack/react-router'

import { AdminLayout } from '@/components/layout'
import { useAuthStore } from '@/stores/use-auth-store'

export const Route = createFileRoute('/admin')({
    beforeLoad: () => {
        const { isAuthenticated, isAdmin } = useAuthStore.getState()
        if (!isAuthenticated) {
            throw redirect({ to: '/login' })
        }
        if (!isAdmin) {
            throw redirect({ to: '/' })
        }
    },
    component: AdminLayout,
})
