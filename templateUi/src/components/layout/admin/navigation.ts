import {
    LayoutDashboard,
    MapPin,
    Bus,
    Building2,
    Settings,
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
    { title: 'Locations', href: '/admin/locations', icon: MapPin },
    { title: 'Trips', href: '/admin/trips', icon: Bus },
    { title: 'Providers', href: '/admin/providers', icon: Building2 },
    { title: 'Settings', href: '/admin/settings', icon: Settings },
]
