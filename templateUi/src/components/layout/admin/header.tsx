import { Bell, User, LogOut, Settings, Search, Command } from 'lucide-react'

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
import { useAuthStore } from '@/stores/use-auth-store'

export function Header() {
    const { user, logout } = useAuthStore()

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-xl px-6">
            {/* Search */}
            <div className="flex-1 max-w-md">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search anything..."
                        className="pl-10 pr-12 h-9 bg-muted/50 border-0 focus-visible:ring-1"
                    />
                    <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                        <Command className="h-3 w-3" />K
                    </kbd>
                </div>
            </div>

            {/* Notifications */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                        <Bell className="h-5 w-5" />
                        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-[10px] font-bold text-white shadow-lg shadow-red-500/30">
                            3
                        </span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80" align="end">
                    <DropdownMenuLabel className="flex items-center justify-between">
                        <span>Notifications</span>
                        <Badge variant="secondary" className="text-xs">3 new</Badge>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {[
                        { title: 'New trip created', desc: 'HN → SG scheduled for tomorrow', time: '2m' },
                        { title: 'Provider updated', desc: 'Phương Trang changed hotline', time: '1h' },
                        { title: 'Trip completed', desc: 'DN → Huế arrived on time', time: '3h' },
                    ].map((notif, i) => (
                        <DropdownMenuItem key={i} className="flex flex-col items-start gap-1 py-3 cursor-pointer">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-primary" />
                                <span className="font-medium text-sm">{notif.title}</span>
                            </div>
                            <div className="flex items-center justify-between w-full pl-4">
                                <span className="text-xs text-muted-foreground">{notif.desc}</span>
                                <span className="text-xs text-muted-foreground">{notif.time}</span>
                            </div>
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="justify-center text-primary cursor-pointer">
                        View all notifications
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 gap-2 pl-2 pr-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/20">
                            {user?.username?.substring(0, 2).toUpperCase() || 'AD'}
                        </div>
                        <div className="hidden md:flex flex-col items-start">
                            <span className="text-sm font-medium">{user?.username || 'Admin'}</span>
                            <span className="text-xs text-muted-foreground capitalize">{user?.role || 'admin'}</span>
                        </div>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuLabel>
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium">{user?.username || 'Admin'}</p>
                            <p className="text-xs text-muted-foreground">{user?.email || user?.phone}</p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => logout()}
                        className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-500/10"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
    )
}
