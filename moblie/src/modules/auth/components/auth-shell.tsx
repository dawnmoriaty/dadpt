import { ReactNode } from 'react'
import { ImageBackground, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'

import { userTheme } from '@/src/constants/user-theme'
import { ResponsiveFrame } from '@/src/components/common/responsive-frame'
import { useWebBreakpoint } from '@/src/hooks/use-web-breakpoint'
import { tw } from '@/src/lib/utils'

interface AuthShellProps {
    title: string
    subtitle: string
    children: ReactNode
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
    const router = useRouter()
    const { isLgUp } = useWebBreakpoint()

    return (
        <SafeAreaView style={[tw`flex-1`, { backgroundColor: userTheme.colors.background }]}>
            {isLgUp ? (
                <View style={tw`flex-1 flex-row`}>
                    <View style={tw`w-1/2 overflow-hidden`}>
                        <ImageBackground
                            source={{ uri: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=2069&auto=format&fit=crop' }}
                            style={[tw`h-full w-full`, { backgroundColor: '#0E8F8B' }]}
                        >
                            <View style={[tw`h-full justify-between p-12`, { backgroundColor: 'rgba(0,0,0,0.58)' }]}>
                                <View style={tw`self-start rounded-full bg-white/20 px-3 py-1`}>
                                    <Text style={tw`text-sm font-semibold text-white`}>DADPT</Text>
                                </View>
                                <View>
                                    <Text style={tw`text-5xl font-extrabold text-white`}>Đặt vé xe khách</Text>
                                    <Text style={tw`mt-3 max-w-md text-lg text-white/80`}>
                                        Tìm chuyến nhanh, đặt chỗ dễ dàng và an toàn
                                    </Text>
                                </View>
                            </View>
                        </ImageBackground>
                    </View>

                    <View style={tw`w-1/2 items-center justify-center px-8`}>
                        <View style={[tw`w-full rounded-3xl bg-white p-6`, { maxWidth: 520, borderColor: userTheme.colors.border, borderWidth: 1 }]}> 
                            <Text style={[tw`text-3xl font-bold`, { color: userTheme.colors.text }]}>{title}</Text>
                            <Text style={[tw`mt-2 mb-5 text-sm`, { color: userTheme.colors.mutedText }]}>{subtitle}</Text>
                            {children}
                        </View>
                    </View>
                </View>
            ) : (
                <ScrollView contentContainerStyle={tw`pb-10`}> 
                    <ResponsiveFrame>
                        <View style={tw`mb-4 mt-10 items-center justify-center`}>
                            <TouchableOpacity onPress={() => router.replace('/')} style={tw`flex-row items-center`}>
                                <View style={[tw`h-10 w-10 items-center justify-center rounded-md`, { backgroundColor: userTheme.colors.primaryStrong }]}> 
                                    <Text style={tw`text-sm font-extrabold text-white`}>D</Text>
                                </View>
                                <Text style={[tw`ml-2 text-2xl font-bold`, { color: userTheme.colors.primaryStrong }]}>DADPT</Text>
                            </TouchableOpacity>
                        </View>
                    </ResponsiveFrame>

                    <ResponsiveFrame>
                        <View style={[tw`mt-3 rounded-3xl bg-white p-4`, { borderColor: userTheme.colors.border, borderWidth: 1 }]}> 
                            <Text style={[tw`text-2xl font-bold`, { color: userTheme.colors.text }]}>{title}</Text>
                            <Text style={[tw`mt-1 mb-4 text-sm`, { color: userTheme.colors.mutedText }]}>{subtitle}</Text>
                            {children}
                        </View>
                    </ResponsiveFrame>
                </ScrollView>
            )}
        </SafeAreaView>
    )
}
