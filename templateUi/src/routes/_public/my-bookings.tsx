import { createFileRoute, redirect } from '@tanstack/react-router'

import { MyBookingsPage } from '@/modules/booking'
import { useAuthStore } from '@/stores/use-auth-store'

export const Route = createFileRoute('/_public/my-bookings')({
    beforeLoad: () => {
        const { isAuthenticated } = useAuthStore.getState()
        if (!isAuthenticated) {
            throw redirect({ to: '/login', search: { redirect: '/my-bookings' } })
        }
    },
    component: MyBookingsPage,
})
