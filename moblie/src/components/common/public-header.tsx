import { usePathname, useRouter } from 'expo-router'
import { LogOut, Menu, Ticket, X } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { Text, TouchableOpacity, View, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { userTheme } from '@/src/constants/user-theme'
import { tw } from '@/src/lib/utils'
import { useAuthStore } from '@/src/stores/use-auth-store'

interface NavLink {
    label: string
    to: string
    authOnly?: boolean
}

export function PublicHeader() {
    const router = useRouter()
    const pathname = usePathname()
    const { width } = useWindowDimensions()
    const isDesktop = width >= 768

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [desktopMenuOpen, setDesktopMenuOpen] = useState(false)

    const user = useAuthStore((state) => state.user)
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
    const logout = useAuthStore((state) => state.logout)

    const navLinks: NavLink[] = useMemo(
        () => [
            { label: 'Trang chủ', to: '/' },
            { label: 'Tìm kiếm vé', to: '/search' },
            { label: 'AI hỗ trợ', to: '/chat' },
            { label: 'Đơn hàng', to: '/my-bookings', authOnly: true },
        ],
        [],
    )

    useEffect(() => {
        setMobileMenuOpen(false)
        setDesktopMenuOpen(false)
    }, [pathname])

    const visibleLinks = navLinks.filter((link) => !link.authOnly || isAuthenticated)
    const isAuthRoute = pathname === '/login' || pathname === '/register'
    const activePath = pathname === '/search' || pathname === '/search-results' ? '/search' : pathname

    const go = (to: string) => {
        router.push(to as never)
    }

    return (
        !isAuthRoute ? (
            <SafeAreaView
                edges={['top', 'left', 'right']}
                style={{
                    borderBottomWidth: 1,
                    borderBottomColor: '#E5E7EB',
                    backgroundColor: 'rgba(255,255,255,0.95)',
                }}
            >
                <View style={tw`mx-auto h-16 w-full max-w-6xl flex-row items-center justify-between px-4`}>
                    <TouchableOpacity onPress={() => go('/')} style={tw`flex-row items-center`}>
                        <View style={[tw`h-9 w-9 items-center justify-center rounded-md`, { backgroundColor: userTheme.colors.primaryStrong }]}>
                            <Text style={tw`text-xs font-extrabold text-white`}>D</Text>
                        </View>
                        <Text style={[tw`ml-2 text-lg font-bold`, { color: userTheme.colors.primaryStrong }]}>DADPT</Text>
                    </TouchableOpacity>

                    {isDesktop ? (
                        <>
                            <View style={tw`flex-row items-center`}>
                                {visibleLinks.map((link) => (
                                    <TouchableOpacity
                                        key={link.to + link.label}
                                        onPress={() => go(link.to)}
                                        style={[
                                            tw`mx-1 rounded-lg px-4 py-2`,
                                            activePath === link.to && { backgroundColor: userTheme.colors.primarySoft },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                tw`text-sm font-medium`,
                                                { color: activePath === link.to ? userTheme.colors.primaryStrong : '#1F2937' },
                                            ]}
                                        >
                                            {link.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {isAuthenticated && user ? (
                                <View style={tw`relative`}>
                                    <TouchableOpacity
                                        style={[tw`h-10 w-10 items-center justify-center rounded-full`, { backgroundColor: userTheme.colors.primarySoft }]}
                                        onPress={() => setDesktopMenuOpen((prev) => !prev)}
                                    >
                                        <Text style={[tw`text-sm font-bold`, { color: userTheme.colors.primaryStrong }]}> 
                                            {(user.fullName?.charAt(0) ?? 'U').toUpperCase()}
                                        </Text>
                                    </TouchableOpacity>

                                    {desktopMenuOpen && (
                                        <View
                                            style={[
                                                tw`absolute right-0 top-12 w-56 rounded-xl bg-white p-2`,
                                                { borderColor: '#E5E7EB', borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12 },
                                            ]}
                                        >
                                            <View style={tw`px-3 py-2`}>
                                                <Text style={tw`text-sm font-semibold text-gray-900`}>{user.fullName}</Text>
                                                <Text style={tw`text-xs text-gray-500`}>{user.email || user.username || user.phone || ''}</Text>
                                            </View>

                                            <TouchableOpacity
                                                style={tw`mt-1 flex-row items-center rounded-lg px-3 py-2`}
                                                onPress={() => go('/my-bookings')}
                                            >
                                                <Ticket size={15} color="#111827" />
                                                <Text style={tw`ml-2 text-sm text-gray-800`}>Đơn hàng của tôi</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={tw`mt-1 flex-row items-center rounded-lg px-3 py-2`}
                                                onPress={() => go('/profile')}
                                            >
                                                <Text style={tw`ml-2 text-sm text-gray-800`}>Tài khoản</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={tw`mt-1 flex-row items-center rounded-lg px-3 py-2`}
                                                onPress={() => {
                                                    logout()
                                                    go('/login')
                                                }}
                                            >
                                                <LogOut size={15} color="#DC2626" />
                                                <Text style={tw`ml-2 text-sm font-medium text-red-600`}>Đăng xuất</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <TouchableOpacity
                                    onPress={() => go('/login')}
                                    style={[
                                        tw`rounded-lg border-2 px-4 py-2`,
                                        {
                                            backgroundColor: '#FFF541',
                                            borderColor: '#FFE81C',
                                        },
                                    ]}
                                >
                                    <Text style={tw`text-sm font-bold text-gray-900`}>Đăng nhập</Text>
                                </TouchableOpacity>
                            )}
                        </>
                    ) : (
                        <TouchableOpacity
                            style={tw`h-10 w-10 items-center justify-center rounded-lg`}
                            onPress={() => setMobileMenuOpen((prev) => !prev)}
                        >
                            {mobileMenuOpen ? <X size={20} color="#111827" /> : <Menu size={20} color="#111827" />}
                        </TouchableOpacity>
                    )}
                </View>

                {!isDesktop && mobileMenuOpen && (
                    <View style={[tw`px-4 pb-4`, { borderTopColor: '#E5E7EB', borderTopWidth: 1 }]}> 
                        {visibleLinks.map((link) => (
                            <TouchableOpacity
                                key={link.to + link.label}
                                onPress={() => go(link.to)}
                                style={tw`mt-2 rounded-lg px-3 py-3`}
                            >
                                <Text style={tw`text-sm font-medium text-gray-800`}>{link.label}</Text>
                            </TouchableOpacity>
                        ))}

                        {isAuthenticated ? (
                            <>
                                <TouchableOpacity
                                    style={tw`mt-2 rounded-lg px-3 py-3`}
                                    onPress={() => go('/profile')}
                                >
                                    <Text style={tw`text-sm font-medium text-gray-800`}>Tài khoản</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={tw`mt-2 flex-row items-center rounded-lg px-3 py-3`}
                                    onPress={() => {
                                        logout()
                                        go('/login')
                                    }}
                                >
                                    <LogOut size={16} color="#DC2626" />
                                    <Text style={tw`ml-2 text-sm font-semibold text-red-600`}>Đăng xuất</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <TouchableOpacity
                                onPress={() => go('/login')}
                                style={[
                                    tw`mt-2 rounded-lg border-2 px-4 py-3`,
                                    {
                                        backgroundColor: '#FFF541',
                                        borderColor: '#FFE81C',
                                    },
                                ]}
                            >
                                <Text style={tw`text-center text-sm font-bold text-gray-900`}>Đăng nhập</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </SafeAreaView>
        ) : null
    )
}
