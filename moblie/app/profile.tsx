import { LoginScreen } from '@/src/modules/auth'
import ProfileScreen from '@/src/modules/profile/profile-screen'
import { useAuthStore } from '@/src/stores/use-auth-store'

export default function ProfilePage() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

    if (!isAuthenticated) {
        return <LoginScreen />
    }

    return <ProfileScreen />
}
