import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Bell, CircleHelp, CreditCard, LogOut, ShieldCheck, UserRound } from 'lucide-react-native'

import { tw } from '@/src/lib/utils'
import { useAuthStore } from '@/src/stores/use-auth-store'

export default function ProfileScreen() {
    const router = useRouter()
    const user = useAuthStore((state) => state.user)
    const logout = useAuthStore((state) => state.logout)

    return (
        <SafeAreaView style={tw`flex-1 bg-gray-50`}>
            <View style={tw`border-b border-gray-100 bg-white px-4 py-4`}>
                <Text style={tw`text-xl font-bold text-gray-900`}>Tai khoan</Text>
                <Text style={tw`mt-1 text-xs text-gray-500`}>Quan ly thong tin va cai dat nguoi dung</Text>
            </View>

            <ScrollView contentContainerStyle={tw`p-4 pb-20`}>
                <View style={tw`mb-4 rounded-2xl bg-slate-900 p-5`}>
                    <View style={tw`flex-row items-center`}>
                        <View style={tw`h-12 w-12 items-center justify-center rounded-full bg-white/20`}>
                            <UserRound size={22} color="#FFFFFF" />
                        </View>
                        <View style={tw`ml-3`}>
                            <Text style={tw`text-base font-bold text-white`}>{user?.fullName ?? 'Khach hang'}</Text>
                            <Text style={tw`text-xs text-slate-300`}>{user?.phone ?? 'Thanh vien tieu chuan'}</Text>
                        </View>
                    </View>
                    <View style={tw`mt-4 rounded-xl bg-white/10 p-3`}>
                        <Text style={tw`text-xs text-slate-300`}>Uu dai hien co</Text>
                        <Text style={tw`mt-1 text-sm font-semibold text-white`}>
                            Giam 10% cho 2 don dat tiep theo
                        </Text>
                    </View>
                </View>

                <View style={tw`mb-4 rounded-2xl border border-gray-100 bg-white p-2`}>
                    <TouchableOpacity style={tw`flex-row items-center rounded-xl px-3 py-3`}>
                        <ShieldCheck size={18} color="#0F766E" />
                        <Text style={tw`ml-3 flex-1 text-sm font-medium text-gray-800`}>Bao mat tai khoan</Text>
                        <Text style={tw`text-xs text-gray-400`}>{'>'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={tw`flex-row items-center rounded-xl px-3 py-3`}>
                        <CreditCard size={18} color="#1D4ED8" />
                        <Text style={tw`ml-3 flex-1 text-sm font-medium text-gray-800`}>Phuong thuc thanh toan</Text>
                        <Text style={tw`text-xs text-gray-400`}>{'>'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={tw`flex-row items-center rounded-xl px-3 py-3`}>
                        <Bell size={18} color="#7C3AED" />
                        <Text style={tw`ml-3 flex-1 text-sm font-medium text-gray-800`}>Thong bao</Text>
                        <Text style={tw`text-xs text-gray-400`}>{'>'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={tw`flex-row items-center rounded-xl px-3 py-3`}>
                        <CircleHelp size={18} color="#EA580C" />
                        <Text style={tw`ml-3 flex-1 text-sm font-medium text-gray-800`}>Ho tro</Text>
                        <Text style={tw`text-xs text-gray-400`}>{'>'}</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={tw`rounded-xl border border-red-200 bg-red-50 py-3`}
                    onPress={() => {
                        logout()
                        router.replace('/login')
                    }}
                >
                    <View style={tw`flex-row items-center justify-center`}>
                        <LogOut size={16} color="#DC2626" />
                        <Text style={tw`ml-2 text-sm font-semibold text-red-600`}>Dang xuat</Text>
                    </View>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    )
}
