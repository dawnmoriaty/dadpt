import {
    LayoutDashboard,
    MapPin,
    Route,
    Building2,
    Bus,
    Ticket,
    Users,
    Settings,
    Grid3X3,
    RotateCcw,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
    title: string
    href: string
    icon: LucideIcon
    badge?: number
}

export const navigationItems: NavItem[] = [
    { title: 'Tổng quan', href: '/admin/dashboard', icon: LayoutDashboard },
    { title: 'Người dùng', href: '/admin/users', icon: Users },
    { title: 'Địa điểm', href: '/admin/locations', icon: MapPin },
    { title: 'Chuyến xe', href: '/admin/trips', icon: Route },
    { title: 'Vé xe', href: '/admin/bookings', icon: Ticket },
    { title: 'Nhà xe', href: '/admin/providers', icon: Building2 },
    { title: 'Loại xe', href: '/admin/bus-types', icon: Grid3X3 },
    { title: 'Xe buýt', href: '/admin/buses', icon: Bus },
    { title: 'Yêu cầu hoàn vé', href: '/admin/refund-requests', icon: RotateCcw },
    { title: 'Cài đặt', href: '/admin/settings', icon: Settings },
]
