import { Link, useLocation } from '@tanstack/react-router'
import { useState } from 'react'
import { Bus, ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { navigationItems } from './navigation'

export function Sidebar() {
    const [collapsed, setCollapsed] = useState(false)
    const location = useLocation()

    return (
        <aside
            className={cn(
                'fixed left-0 top-0 z-40 h-screen border-r bg-background transition-all duration-300 flex flex-col',
                collapsed ? 'w-16' : 'w-64'
            )}
        >
            {/* Logo */}
            <div className={cn(
                'flex h-16 items-center border-b px-4 shrink-0',
                collapsed ? 'justify-center' : 'gap-2'
            )}>
                <Bus className="h-6 w-6 text-primary shrink-0" />
                {!collapsed && <span className="font-bold text-lg">Admin</span>}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-2 space-y-1">
                {navigationItems.map((item) => {
                    const isActive = location.pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                collapsed && 'justify-center px-2'
                            )}
                            title={collapsed ? item.title : undefined}
                        >
                            <item.icon className="h-5 w-5 shrink-0" />
                            {!collapsed && <span>{item.title}</span>}
                        </Link>
                    )
                })}
            </nav>

            {/* Collapse button */}
            <div className="p-2 border-t shrink-0">
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn('w-full', collapsed && 'px-2')}
                    onClick={() => setCollapsed(!collapsed)}
                >
                    {collapsed ? (
                        <ChevronRight className="h-4 w-4" />
                    ) : (
                        <>
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            <span>Collapse</span>
                        </>
                    )}
                </Button>
            </div>
        </aside>
    )
}

// Export width để layout dùng
export const SIDEBAR_WIDTH = 256
export const SIDEBAR_WIDTH_COLLAPSED = 64
