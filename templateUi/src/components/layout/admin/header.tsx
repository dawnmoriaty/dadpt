import { Bell, LogOut, RotateCcw, Search, Settings, User } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

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
import { Input } from '@/components/ui/input'
import { useRefundPendingCount } from '@/modules/booking'
import { useAuthStore } from '@/stores/use-auth-store'

export function Header() {
    const { user, logout } = useAuthStore()
    const navigate = useNavigate()
    const { data: refundCountData } = useRefundPendingCount()

    const refundPendingCount = refundCountData?.count ?? 0

    return (
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 backdrop-blur-xl px-6">
            {/* Search */}
            <div className="flex-1 max-w-sm">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Tìm kiếm..."
                        className="pl-9 h-9 bg-muted/40 border-0 focus-visible:ring-1 rounded-lg text-sm"
                    />
                </div>
            </div>

            {/* Notifications */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-lg">
                        <Bell className="h-[18px] w-[18px]" />
                        {refundPendingCount > 0 && (
                            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                                {refundPendingCount}
                            </span>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80 p-0" align="end" sideOffset={8}>
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                        <span className="text-sm font-semibold">Thông báo</span>
                        {refundPendingCount > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-medium">
                                {refundPendingCount} mới
                            </Badge>
                        )}
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                        {refundPendingCount > 0 ? (
                            <button
                                type="button"
                                onClick={() => navigate({ to: '/admin/refund-requests' })}
                                className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors w-full text-left"
                            >
                                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                                    <RotateCcw className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium truncate">
                                            Yêu cầu hoàn vé
                                        </span>
                                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                                        Có {refundPendingCount} yêu cầu hoàn vé đang chờ duyệt
                                    </p>
                                </div>
                            </button>
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
                    <Button variant="ghost" className="relative h-9 gap-2 pl-1.5 pr-2.5 rounded-lg">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-xs">
                            {user?.username?.substring(0, 2).toUpperCase() || 'AD'}
                        </div>
                        <div className="hidden md:flex flex-col items-start">
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
                    <DropdownMenuItem className="cursor-pointer gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        Hồ sơ
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer gap-2 text-sm">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        Cài đặt
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => logout()}
                        className="cursor-pointer gap-2 text-sm text-red-600 focus:text-red-600 focus:bg-red-500/10"
                    >
                        <LogOut className="h-4 w-4" />
                        Đăng xuất
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
    )
}
