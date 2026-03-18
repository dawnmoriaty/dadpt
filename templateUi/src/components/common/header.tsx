import { Link, useNavigate } from '@tanstack/react-router'
import { Bus, LogOut, Menu, Settings, Ticket, User, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/use-auth-store'

export function Header() {
    const { user, isAuthenticated, logout } = useAuthStore()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const { t } = useTranslation()
    const navigate = useNavigate()

    const handleLogin = () => {
        setMobileMenuOpen(false)
        navigate({ to: '/login' })
    }

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
                <div className="flex items-center gap-6">
                    <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
                        <Bus className="h-6 w-6" />
                        {t('nav.brand')}
                    </Link>
                    <nav className="hidden md:flex items-center gap-1">
                        <Link to="/" className="px-3 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors">
                            {t('nav.home')}
                        </Link>
                        <Link to="/search" className="px-3 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors">
                            {t('nav.search')}
                        </Link>
                        <Link to="/chat" className="px-3 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors">
                            Chat AI
                        </Link>
                        {isAuthenticated && (
                            <Link to="/my-bookings" className="px-3 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors">
                                {t('nav.myBookings')}
                            </Link>
                        )}
                    </nav>
                </div>

                <nav className="flex items-center gap-2">
                    {/* Desktop user menu */}
                    <div className="hidden md:flex items-center">
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
                                            <span>{t('nav.myBookings')}</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <Settings className="mr-2 h-4 w-4" />
                                        <span>{t('auth.settings')}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={logout} className="text-red-600">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>{t('auth.logout')}</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Button onClick={handleLogin}>{t('auth.loginOrRegister')}</Button>
                        )}
                    </div>

                    {/* Mobile hamburger button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label={t('header.menu')}
                    >
                        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>
                </nav>
            </div>

            {/* Mobile menu overlay */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t bg-background">
                    <nav className="container py-4 space-y-1">
                        <Link
                            to="/"
                            className="block px-3 py-2.5 text-sm font-medium rounded-md hover:bg-accent transition-colors"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            {t('nav.home')}
                        </Link>
                        <Link
                            to="/search"
                            className="block px-3 py-2.5 text-sm font-medium rounded-md hover:bg-accent transition-colors"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            {t('nav.search')}
                        </Link>
                        <Link
                            to="/chat"
                            className="block px-3 py-2.5 text-sm font-medium rounded-md hover:bg-accent transition-colors"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Chat AI
                        </Link>
                        {isAuthenticated && (
                            <Link
                                to="/my-bookings"
                                className="block px-3 py-2.5 text-sm font-medium rounded-md hover:bg-accent transition-colors"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {t('nav.myBookings')}
                            </Link>
                        )}

                        <div className="pt-3 border-t mt-3">
                            {isAuthenticated && user ? (
                                <div className="space-y-1">
                                    <div className="px-3 py-2">
                                        <p className="text-sm font-medium">{user.fullName}</p>
                                        <p className="text-xs text-muted-foreground">{user.email || user.username}</p>
                                    </div>
                                    <Link
                                        to="/my-bookings"
                                        className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-md hover:bg-accent transition-colors"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <Ticket className="h-4 w-4" />
                                        {t('nav.myBookings')}
                                    </Link>
                                    <button
                                        onClick={() => { logout(); setMobileMenuOpen(false) }}
                                        className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-md text-red-600 hover:bg-accent transition-colors"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        {t('auth.logout')}
                                    </button>
                                </div>
                            ) : (
                                <Button onClick={handleLogin} className="w-full">
                                    {t('auth.loginOrRegister')}
                                </Button>
                            )}
                        </div>
                    </nav>
                </div>
            )}
        </header>
    )
}
