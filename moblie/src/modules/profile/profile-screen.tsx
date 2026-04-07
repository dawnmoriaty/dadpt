import { ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { Bell, ChevronRight, CircleHelp, CreditCard, LogOut, ShieldCheck, UserRound } from 'lucide-react-native'

import { PublicLayout, ResponsiveFrame } from '@/src/components/common'
import { userTheme } from '@/src/constants/user-theme'
import { tw } from '@/src/lib/utils'
import { useAuthStore } from '@/src/stores/use-auth-store'

export default function ProfileScreen() {
    const router = useRouter()
    const { width } = useWindowDimensions()
    const isDesktop = width >= 768
    const user = useAuthStore((state) => state.user)
    const logout = useAuthStore((state) => state.logout)

    return (
        <PublicLayout>
            {isDesktop && (
                <View style={[tw`px-4 py-4`, { borderBottomColor: '#D5D5D5', borderBottomWidth: 1, backgroundColor: userTheme.colors.background }]}> 
                    <Text style={[tw`text-xl font-bold`, { color: userTheme.colors.text }]}>Tài khoản</Text>
                    <Text style={[tw`mt-1 text-xs`, { color: userTheme.colors.mutedText }]}>Quản lý thông tin và cài đặt người dùng</Text>
                </View>
            )}

            <ScrollView contentContainerStyle={tw`pb-10`}>
                <ResponsiveFrame style={tw`pt-4`}>
                    <View style={[tw`mb-4 rounded-2xl p-5`, { backgroundColor: '#1FB6B2' }]}> 
                        <View style={tw`flex-row items-center`}>
                            <View style={[tw`h-12 w-12 items-center justify-center rounded-full`, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                                <UserRound size={22} color="#FFFFFF" />
                            </View>
                            <View style={tw`ml-3`}>
                                <Text style={tw`text-base font-bold text-white`}>{user?.fullName ?? 'Khách hàng'}</Text>
                                <Text style={[tw`text-xs`, { color: '#D7F7F5' }]}>{user?.phone ?? 'Thành viên tiêu chuẩn'}</Text>
                            </View>
                        </View>
                        <View style={[tw`mt-4 rounded-xl p-3`, { backgroundColor: '#45C4C0' }]}> 
                            <Text style={[tw`text-xs`, { color: '#D7F7F5' }]}>Ưu đãi hiện có</Text>
                            <Text style={tw`mt-1 text-sm font-semibold text-white`}>Giảm 10% cho 2 đơn đặt tiếp theo</Text>
                        </View>
                    </View>

                    <View style={[tw`mb-4 rounded-2xl bg-white p-2`, { borderColor: '#D1D1D1', borderWidth: 1 }]}> 
                        <TouchableOpacity style={[tw`flex-row items-center rounded-xl px-3 py-3`, { minHeight: 48 }]}>
                            <ShieldCheck size={18} color="#0F766E" />
                            <Text style={[tw`ml-3 flex-1 text-sm font-medium`, { color: userTheme.colors.text }]}>Bảo mật tài khoản</Text>
                            <ChevronRight size={14} color="#A3A3A3" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[tw`flex-row items-center rounded-xl px-3 py-3`, { minHeight: 48 }]}>
                            <CreditCard size={18} color="#1D4ED8" />
                            <Text style={[tw`ml-3 flex-1 text-sm font-medium`, { color: userTheme.colors.text }]}>Phương thức thanh toán</Text>
                            <ChevronRight size={14} color="#A3A3A3" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[tw`flex-row items-center rounded-xl px-3 py-3`, { minHeight: 48 }]}>
                            <Bell size={18} color="#0EA5A5" />
                            <Text style={[tw`ml-3 flex-1 text-sm font-medium`, { color: userTheme.colors.text }]}>Thông báo</Text>
                            <ChevronRight size={14} color="#A3A3A3" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[tw`flex-row items-center rounded-xl px-3 py-3`, { minHeight: 48 }]}>
                            <CircleHelp size={18} color="#EA580C" />
                            <Text style={[tw`ml-3 flex-1 text-sm font-medium`, { color: userTheme.colors.text }]}>Hỗ trợ</Text>
                            <ChevronRight size={14} color="#A3A3A3" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[tw`rounded-xl py-3`, { borderColor: '#F7B4B4', borderWidth: 1, backgroundColor: '#FFF5F5' }]}
                        onPress={() => {
                            logout()
                            router.replace('/login')
                        }}
                    >
                        <View style={tw`flex-row items-center justify-center`}>
                            <LogOut size={16} color="#DC2626" />
                            <Text style={tw`ml-2 text-sm font-semibold text-red-600`}>Đăng xuất</Text>
                        </View>
                    </TouchableOpacity>
                </ResponsiveFrame>
            </ScrollView>
        </PublicLayout>
    )
}
