import {
    LayoutDashboard,
    Users,
    ShoppingCart,
    Settings,
    Bus,
    MapPin,
    BarChart3,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
    title: string
    href: string
    icon: LucideIcon
    badge?: number
}

export const navigationItems: NavItem[] = [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Users', href: '/users', icon: Users },
    { title: 'Routes', href: '/routes', icon: MapPin },
    { title: 'Buses', href: '/buses', icon: Bus },
    { title: 'Orders', href: '/orders', icon: ShoppingCart },
    { title: 'Reports', href: '/reports', icon: BarChart3 },
    { title: 'Settings', href: '/settings', icon: Settings },
]
