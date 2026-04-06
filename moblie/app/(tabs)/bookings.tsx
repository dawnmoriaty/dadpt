import { MyBookingsScreen } from '@/src/modules/booking'
import { LoginScreen } from '@/src/modules/auth'
import { useAuthStore } from '@/src/stores/use-auth-store'

export default function BookingsPage() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

    if (!isAuthenticated) {
        return <LoginScreen />
    }

    return <MyBookingsScreen />
}
