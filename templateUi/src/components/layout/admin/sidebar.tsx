import { Link, useLocation } from '@tanstack/react-router'
import { Bus, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useRefundPendingCount, useRefundSSE } from '@/modules/booking'

import { navigationItems } from './navigation'

export function Sidebar() {
    const [collapsed, setCollapsed] = useState(false)
    const location = useLocation()
    const { data: refundCountData } = useRefundPendingCount()

    // SSE: real-time refund notifications (invalidates badge count automatically)
    useRefundSSE()

    const refundPendingCount = refundCountData?.count ?? 0

    return (
        <aside
            className={cn(
                'fixed left-0 top-0 z-40 h-screen border-r bg-gradient-to-b from-background via-background to-muted/20 transition-all duration-300 flex flex-col',
                collapsed ? 'w-[72px]' : 'w-64'
            )}
        >
            {/* Logo */}
            <div className={cn(
                'flex h-16 items-center border-b px-4 shrink-0',
                collapsed ? 'justify-center' : 'gap-3'
            )}>
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary via-primary to-primary/80 shadow-lg shadow-primary/25">
                    <Bus className="h-5 w-5 text-primary-foreground" />
                </div>
                {!collapsed && (
                    <div className="flex flex-col">
                        <span className="font-bold text-lg tracking-tight">BusAdmin</span>
                        <span className="text-[10px] text-muted-foreground -mt-0.5">Quản lý vé xe</span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {navigationItems.map((item) => {
                    const isActive = location.pathname === item.href || 
                        (item.href !== '/admin/dashboard' && location.pathname.startsWith(item.href))
                    const isRefundItem = item.href === '/admin/refund-requests'
                    const badgeCount = isRefundItem ? refundPendingCount : 0
                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            className={cn(
                                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                                isActive
                                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                collapsed && 'justify-center px-2'
                            )}
                            title={collapsed ? item.title : undefined}
                        >
                            <div className="relative shrink-0">
                                <item.icon className={cn(
                                    'h-5 w-5 transition-transform duration-200',
                                    isActive ? '' : 'group-hover:scale-110'
                                )} />
                                {collapsed && badgeCount > 0 && (
                                    <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-destructive-foreground">
                                        {badgeCount}
                                    </span>
                                )}
                            </div>
                            {!collapsed && (
                                <>
                                    <span className="truncate flex-1">{item.title}</span>
                                    {badgeCount > 0 && (
                                        <Badge
                                            variant={isActive ? 'secondary' : 'destructive'}
                                            className="h-5 min-w-5 px-1.5 text-[10px] font-bold justify-center"
                                        >
                                            {badgeCount}
                                        </Badge>
                                    )}
                                    {!badgeCount && isActive && (
                                        <Sparkles className="h-3 w-3 ml-auto opacity-60" />
                                    )}
                                </>
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* Collapse button */}
            <div className="p-3 border-t shrink-0">
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        'w-full justify-center hover:bg-muted',
                        collapsed && 'px-2'
                    )}
                    onClick={() => setCollapsed(!collapsed)}
                >
                    {collapsed ? (
                        <ChevronRight className="h-4 w-4" />
                    ) : (
                        <>
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            <span className="text-xs">Thu gọn</span>
                        </>
                    )}
                </Button>
            </div>
        </aside>
    )
}

export const SIDEBAR_WIDTH = 256
export const SIDEBAR_WIDTH_COLLAPSED = 72
