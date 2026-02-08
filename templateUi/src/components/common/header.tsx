import { Link } from '@tanstack/react-router'
import { LogOut, Settings, Ticket, User } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AuthModal } from '@/modules/auth'
import { useAuthStore } from '@/stores/use-auth-store'

export function Header() {
    const { user, isAuthenticated, logout } = useAuthStore()
    const [authOpen, setAuthOpen] = useState(false)

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
                <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
                    Đặt Xe Khách 
                </Link>

                <nav className="flex items-center gap-4">
                    {isAuthenticated && user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                    <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <User className="h-4 w-4" />
                                    </div>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{user.fullName}</p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {user.email || user.username}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link to="/my-bookings">
                                        <Ticket className="mr-2 h-4 w-4" />
                                        <span>My Bookings</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Settings className="mr-2 h-4 w-4" />
                                    <span>Settings</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={logout} className="text-red-600">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <>
                            <Button onClick={() => setAuthOpen(true)}>Login / Register</Button>
                            <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
                        </>
                    )}
                </nav>
            </div>
        </header>
    )
}
