import { PublicLayout } from '@/src/components/common'
import { LoginScreen } from '@/src/modules/auth'
import { MyBookingsScreen } from '@/src/modules/booking'
import { useAuthStore } from '@/src/stores/use-auth-store'

export default function MyBookingsPage() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

    if (!isAuthenticated) {
        return <LoginScreen />
    }

    return (
        <PublicLayout>
            <MyBookingsScreen />
        </PublicLayout>
    )
}
