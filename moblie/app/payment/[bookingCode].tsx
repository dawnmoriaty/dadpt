import { useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PublicLayout } from '@/src/components/common'
import { tw } from '@/src/lib/utils'
import { BookingSuccessScreen, useBookingByCode } from '@/src/modules/booking'

export default function PaymentResumePage() {
    const { bookingCode, orderCode } = useLocalSearchParams()
    const code = typeof bookingCode === 'string' ? bookingCode : ''
    const order = typeof orderCode === 'string' ? orderCode : undefined

    const { data, isLoading, isError } = useBookingByCode(code, order)

    if (isLoading) {
        return (
            <PublicLayout>
                <SafeAreaView style={tw`flex-1 items-center justify-center bg-gray-50`}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={tw`mt-3 text-gray-600`}>Dang tai thong tin thanh toan...</Text>
                </SafeAreaView>
            </PublicLayout>
        )
    }

    if (isError || !data) {
        return (
            <PublicLayout>
                <SafeAreaView style={tw`flex-1 items-center justify-center bg-gray-50 px-4`}>
                    <Text style={tw`text-center text-gray-600`}>Khong tim thay thong tin thanh toan cho ma ve nay.</Text>
                </SafeAreaView>
            </PublicLayout>
        )
    }

    return (
        <PublicLayout>
            <SafeAreaView style={tw`flex-1 bg-gray-50`}>
                <View style={tw`border-b border-gray-100 bg-white px-4 py-3`}>
                    <Text style={tw`text-lg font-bold text-gray-900`}>Tiep tuc thanh toan</Text>
                </View>

                <BookingSuccessScreen data={data} onReset={() => null} />
            </SafeAreaView>
        </PublicLayout>
    )
}
