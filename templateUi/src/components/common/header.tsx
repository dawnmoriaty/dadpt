'use client'

import { Link, useNavigate } from '@tanstack/react-router'
import { LogOut, Menu, Ticket, X } from 'lucide-react'
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
    const logoSrc = `${import.meta.env.BASE_URL}LOGOBUS.png`
    const { user, isAuthenticated, logout } = useAuthStore()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    useTranslation()
    const navigate = useNavigate()

    const handleLogin = () => {
        setMobileMenuOpen(false)
        navigate({ to: '/login' })
    }

    const navLinks = [
        { label: 'Trang chủ', to: '/' },
        { label: 'Tìm kiếm vé', to: '/search' },
        { label: 'AI hỗ trợ', to: '/chat' },
    ]

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-gradient-to-r from-white to-blue-50/30 backdrop-blur supports-backdrop-filter:bg-white/80">
            <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
                {/* Logo */}
                <Link to="/" className="flex items-center font-bold text-lg text-primary transition-transform hover:scale-105">
                    <img src={logoSrc} alt="DADPT logo" className="h-20 w-20 rounded-lg object-cover" />
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-1">
                    {navLinks.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-foreground rounded-lg transition-all hover:bg-primary/10 hover:text-primary active:scale-95"
                        >
                            {/* {link.icon && <link.icon className="h-4 w-4" />} */}
                            {link.label}
                        </Link>
                    ))}
                    {isAuthenticated && (
                        <Link
                            to="/my-bookings"
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-foreground rounded-lg transition-all hover:bg-primary/10 hover:text-primary active:scale-95"
                        >
                            <Ticket className="h-4 w-4" />
                            Đơn hàng
                        </Link>
                    )}
                </nav>

                {/* Right Section */}
                <div className="flex items-center gap-3">
                    {/* Desktop User Menu */}
                    <div className="hidden md:block">
                        {isAuthenticated && user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="relative h-10 w-10 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                                    >
                                        <div className="flex h-full w-full items-center justify-center text-primary font-semibold">
                                            {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                                        </div>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end" forceMount>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-semibold text-foreground">{user.fullName}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {user.email || user.username}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link to="/my-bookings" className="cursor-pointer">
                                            <Ticket className="mr-2 h-4 w-4" />
                                            <span>Đơn hàng của tôi</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={logout}
                                        className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50"
                                    >
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>Đăng xuất</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Button
                                onClick={handleLogin}
                                className="h-10 font-bold rounded-lg border-2 text-gray-900 active:scale-95 transition-all duration-300"
                                style={{
                                    backgroundColor: '#FFF541',
                                    borderColor: '#FFE81C',
                                    color: '#1F2937'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#FFED4F'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#FFF541'
                                }}
                            >
                                Đăng nhập
                            </Button>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden h-10 w-10 rounded-lg hover:bg-primary/10"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Menu điều hướng"
                    >
                        {mobileMenuOpen ? (
                            <X className="h-5 w-5" />
                        ) : (
                            <Menu className="h-5 w-5" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t bg-white/95 backdrop-blur animate-in fade-in slide-in-from-top-2">
                    <nav className="container mx-auto flex max-w-7xl flex-col px-4 py-3 gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-foreground rounded-lg hover:bg-primary/10 transition-colors"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {/* {link.icon && <link.icon className="h-4 w-4 text-primary" />} */}
                                {link.label}
                            </Link>
                        ))}
                        {isAuthenticated && (
                            <Link
                                to="/my-bookings"
                                className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-foreground rounded-lg hover:bg-primary/10 transition-colors"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <Ticket className="h-4 w-4 text-primary" />
                                Đơn hàng
                            </Link>
                        )}

                        <div className="border-t mt-2 pt-2">
                            {isAuthenticated && user ? (
                                <div className="space-y-2">
                                    <div className="px-4 py-2 bg-primary/5 rounded-lg">
                                        <p className="text-sm font-semibold text-foreground">{user.fullName}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{user.email || user.username}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            logout()
                                            setMobileMenuOpen(false)
                                        }}
                                        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Đăng xuất
                                    </button>
                                </div>
                            ) : (
                                <Button
                                    onClick={handleLogin}
                                    className="w-full bg-gradient-to-r from-primary to-primary/80"
                                >
                                    Đăng nhập
                                </Button>
                            )}
                        </div>
                    </nav>
                </div>
            )}
        </header>
    )
}
