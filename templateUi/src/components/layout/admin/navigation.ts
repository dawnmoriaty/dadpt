import {
    LayoutDashboard,
    MapPin,
    Route,
    Building2,
    Bus,
    Users,
    Settings,
    Grid3X3,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
    title: string
    href: string
    icon: LucideIcon
    badge?: number
}

export const navigationItems: NavItem[] = [
    { title: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { title: 'Users', href: '/admin/users', icon: Users },
    { title: 'Locations', href: '/admin/locations', icon: MapPin },
    { title: 'Trips', href: '/admin/trips', icon: Route },
    { title: 'Providers', href: '/admin/providers', icon: Building2 },
    { title: 'Bus Types', href: '/admin/bus-types', icon: Grid3X3 },
    { title: 'Buses', href: '/admin/buses', icon: Bus },
    { title: 'Settings', href: '/admin/settings', icon: Settings },
]
