import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { Alert, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { CheckCircle2, Clock3, Copy, CreditCard, ExternalLink } from 'lucide-react-native'

import { tw } from '@/src/lib/utils'

import { usePaymentStatus } from '../hooks'
import type { CreateBookingResponse } from '../types'

interface BookingSuccessScreenProps {
    data: CreateBookingResponse
    onReset: () => void
}

function formatVndCurrency(amount: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

export function BookingSuccessScreen({ data, onReset }: BookingSuccessScreenProps) {
    const router = useRouter()
    const { booking, orderCode, qrCode } = data

    const needsPolling = booking.paymentMethod === 'bank_transfer' && booking.status !== 'paid' && orderCode.length > 0
    const { data: paymentStatus } = usePaymentStatus(orderCode, needsPolling)

    const isPaid = booking.paymentMethod === 'cod' || booking.status === 'paid' || paymentStatus?.status === 'success'

    useEffect(() => {
        if (paymentStatus?.status === 'success') {
            router.replace('/(tabs)/bookings')
        }
    }, [paymentStatus?.status, router])

    const handleCopyOrderCode = () => {
        void navigator.clipboard?.writeText?.(orderCode)
    }

    const handleOpenPayment = async () => {
        if (!data.paymentUrl) {
            return
        }
        try {
            const canOpen = await Linking.canOpenURL(data.paymentUrl)
            if (!canOpen) {
                Alert.alert('Khong mo duoc', 'Khong the mo lien ket thanh toan tren thiet bi nay.')
                return
            }
            await Linking.openURL(data.paymentUrl)
        } catch {
            Alert.alert('Loi', 'Da xay ra loi khi mo trang thanh toan.')
        }
    }

    return (
        <ScrollView contentContainerStyle={tw`p-4 pb-10`}>
            <View style={tw`${isPaid ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'} mb-4 rounded-2xl border p-4`}>
                <View style={tw`items-center`}>
                    {isPaid ? (
                        <CheckCircle2 size={56} color="#16A34A" />
                    ) : (
                        <Clock3 size={56} color="#CA8A04" />
                    )}

                    <Text style={tw`${isPaid ? 'text-green-700' : 'text-yellow-700'} mt-2 text-xl font-bold`}>
                        {isPaid ? 'Dat ve thanh cong' : 'Cho thanh toan'}
                    </Text>
                    <Text style={tw`${isPaid ? 'text-green-700' : 'text-yellow-700'} mt-1 text-center text-sm`}>
                        {isPaid ? 'Ve cua ban da duoc xac nhan.' : 'Vui long hoan tat thanh toan de xac nhan ve.'}
                    </Text>
                </View>
            </View>

            <View style={tw`mb-4 rounded-2xl border border-gray-100 bg-white p-4`}>
                <Text style={tw`text-xs text-gray-500`}>Ma dat cho</Text>
                <Text style={tw`mt-1 text-2xl font-bold text-blue-700`}>{booking.code}</Text>

                <View style={tw`mt-4 flex-row items-center justify-between`}>
                    <View>
                        <Text style={tw`text-xs text-gray-500`}>Ma giao dich</Text>
                        <Text style={tw`mt-1 text-base font-semibold text-gray-800`}>{orderCode}</Text>
                    </View>
                    <TouchableOpacity onPress={handleCopyOrderCode} style={tw`rounded-lg border border-gray-200 px-3 py-2`}>
                        <View style={tw`flex-row items-center`}>
                            <Copy size={14} color="#374151" />
                            <Text style={tw`ml-1 text-sm text-gray-700`}>Copy</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={tw`mb-4 rounded-2xl border border-gray-100 bg-white p-4`}>
                <Text style={tw`mb-3 text-base font-bold text-gray-900`}>Chi tiet ve</Text>
                <Text style={tw`mb-1 text-sm text-gray-600`}>Khach hang: {booking.guestInfo.name}</Text>
                <Text style={tw`mb-1 text-sm text-gray-600`}>So dien thoai: {booking.guestInfo.phone}</Text>
                <Text style={tw`mb-1 text-sm text-gray-600`}>Ghe: {booking.seatCodes.join(', ')}</Text>
                <Text style={tw`mb-1 text-sm text-gray-600`}>Tuyen: {booking.originName ?? '-'} - {booking.destinationName ?? '-'}</Text>
                <Text style={tw`mb-1 text-sm text-gray-600`}>Diem don: {booking.pickupInfo?.name ?? '-'}</Text>
                <Text style={tw`mb-1 text-sm text-gray-600`}>Diem tra: {booking.dropoffInfo?.name ?? '-'}</Text>
                <Text style={tw`mt-2 text-lg font-bold text-blue-700`}>{formatVndCurrency(booking.totalAmount)}</Text>
            </View>

            {!isPaid && (
                <View style={tw`mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4`}>
                    <View style={tw`mb-2 flex-row items-center`}>
                        <CreditCard size={18} color="#1D4ED8" />
                        <Text style={tw`ml-2 text-base font-bold text-blue-700`}>Huong dan thanh toan</Text>
                    </View>
                    {!!qrCode && (
                        <Text style={tw`text-sm text-blue-700`}>
                            Ma QR da san sang ({qrCode.length} ky tu). Ban co the tiep tuc thanh toan trong tab Ve cua toi.
                        </Text>
                    )}

                    {!!data.paymentUrl && (
                        <TouchableOpacity
                            style={tw`mt-3 rounded-xl border border-blue-300 bg-white py-3`}
                            onPress={handleOpenPayment}
                        >
                            <View style={tw`flex-row items-center justify-center`}>
                                <ExternalLink size={15} color="#1D4ED8" />
                                <Text style={tw`ml-2 text-sm font-semibold text-blue-700`}>Mo trang thanh toan</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            <View style={tw`flex-row`}>
                <TouchableOpacity style={tw`mr-2 flex-1 rounded-xl border border-gray-200 py-3`} onPress={onReset}>
                    <Text style={tw`text-center font-semibold text-gray-700`}>Dat ve moi</Text>
                </TouchableOpacity>
                <TouchableOpacity style={tw`flex-1 rounded-xl bg-blue-600 py-3`} onPress={() => router.replace('/(tabs)/bookings')}>
                    <Text style={tw`text-center font-semibold text-white`}>Xem ve cua toi</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    )
}
