import { useNavigate } from '@tanstack/react-router'
import { Bell, LogOut, RotateCcw, Settings, TicketX, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRefundPendingCount, useRefundRequestEventFeed } from '@/modules/booking/hooks/use-refund-requests-hooks'
import { useAuthStore } from '@/stores/use-auth-store'

export function Header() {
    const { t } = useTranslation()
    const { user, logout } = useAuthStore()
    const navigate = useNavigate()
    const { data: refundCountData } = useRefundPendingCount()
    const { data: eventFeed } = useRefundRequestEventFeed()

    const refundPendingCount = refundCountData?.count ?? 0
    const totalNotificationCount = (eventFeed?.length ?? 0) + refundPendingCount

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-end gap-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 shadow-sm border-b border-transparent">

            {/* Notifications */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full hover:bg-muted/60 transition-colors group">
                        <Bell className="h-[18px] w-[18px] transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                        {totalNotificationCount > 0 && (
                            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-in zoom-in duration-300">
                                {totalNotificationCount}
                            </span>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80 p-0" align="end" sideOffset={8}>
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                        <span className="text-sm font-semibold">Thông báo</span>
                        {totalNotificationCount > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-medium">
                                {totalNotificationCount} mới
                            </Badge>
                        )}
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                        {(refundPendingCount > 0 || (eventFeed?.length ?? 0) > 0) ? (
                            <>
                                {refundPendingCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => navigate({ to: '/admin/refund-requests' })}
                                        className="group flex items-start gap-3 px-4 py-3 hover:bg-accent/50 cursor-pointer transition-all active:scale-[0.98] w-full text-left"
                                    >
                                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100/80 text-amber-600 transition-colors group-hover:bg-amber-100 group-hover:text-amber-700">
                                            <RotateCcw className="h-4 w-4 transition-transform duration-500 group-hover:-rotate-180" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium truncate">
                                                    {t('refundRequests.title')}
                                                </span>
                                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                {t('refundRequests.found', { count: refundPendingCount })}
                                            </p>
                                        </div>
                                    </button>
                                )}

                                {(eventFeed ?? []).slice(0, 8).map((event) => (
                                    <div
                                        key={event.id}
                                        className="group flex items-start gap-3 px-4 py-3 hover:bg-accent/40 transition-colors"
                                    >
                                        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${event.type === 'refund_requested' ? 'bg-amber-100/80 text-amber-700' : 'bg-rose-100/80 text-rose-700'}`}>
                                            {event.type === 'refund_requested' ? <RotateCcw className="h-4 w-4" /> : <TicketX className="h-4 w-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {event.type === 'refund_requested'
                                                    ? t('refundRequests.newRequest', {
                                                        code: event.code,
                                                        name: event.guestName,
                                                        amount: new Intl.NumberFormat('vi-VN', {
                                                            style: 'currency',
                                                            currency: 'VND',
                                                        }).format(event.amount),
                                                    })
                                                    : t('refundRequests.bookingCancelled', {
                                                        code: event.code,
                                                        name: event.guestName,
                                                    })}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {new Date(event.createdAt).toLocaleString('vi-VN')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                Không có thông báo mới
                            </div>
                        )}
                    </div>
                    <div className="border-t px-4 py-2.5">
                        <Button
                            variant="ghost"
                            className="w-full h-8 text-xs text-primary hover:text-primary hover:bg-primary/5 font-medium"
                            onClick={() => navigate({ to: '/admin/refund-requests' })}
                        >
                            Xem tất cả yêu cầu hoàn vé
                        </Button>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 gap-2 pl-1.5 pr-2.5 rounded-full hover:bg-muted/60 transition-colors group">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                            {user?.username?.substring(0, 2).toUpperCase() || 'AD'}
                        </div>
                        <div className="hidden md:flex flex-col items-start transition-opacity group-hover:opacity-80">
                            <span className="text-sm font-medium leading-tight">
                                {user?.username || 'Admin'}
                            </span>
                            <span className="text-[11px] text-muted-foreground capitalize leading-tight">
                                {user?.role || 'admin'}
                            </span>
                        </div>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-52" align="end" sideOffset={8}>
                    <DropdownMenuLabel className="pb-2">
                        <p className="text-sm font-medium">{user?.username || 'Admin'}</p>
                        <p className="text-xs text-muted-foreground">{user?.email || user?.phone}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer gap-2 text-sm transition-colors group">
                        <User className="h-4 w-4 text-muted-foreground transition-transform group-hover:scale-110" />
                        Hồ sơ
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer gap-2 text-sm transition-colors group">
                        <Settings className="h-4 w-4 text-muted-foreground transition-transform duration-500 group-hover:rotate-90 group-hover:scale-110" />
                        Cài đặt
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => logout()}
                        className="cursor-pointer gap-2 text-sm text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/50 transition-colors group"
                    >
                        <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        Đăng xuất
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
    )
}
