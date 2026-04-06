import { ActivityIndicator, Alert, FlatList, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ArrowRight, Clock, Copy, Ticket, Undo2, XCircle } from 'lucide-react-native'

import { tw } from '@/src/lib/utils'
import { useAuthStore } from '@/src/stores/use-auth-store'

import { useCancelBooking, useMyBookings } from '../hooks'
import type { Booking } from '../types'

const REFUND_WINDOW_MS = 5 * 60 * 1000

function getRefundRemainingMs(booking: Booking): number {
    if (booking.status !== 'paid' || !booking.updatedAt) {
        return 0
    }

    const paidAt = new Date(booking.updatedAt).getTime()
    const deadline = paidAt + REFUND_WINDOW_MS
    return Math.max(0, deadline - Date.now())
}

function formatCountdown(remainingMs: number): string {
    const totalSeconds = Math.floor(remainingMs / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function getStatusBadgeStyle(status: Booking['status']) {
    switch (status) {
        case 'paid':
            return {
                text: 'text-green-600',
                bg: 'bg-green-50',
                border: 'border-green-200',
                label: 'Da thanh toan',
            }
        case 'pending':
            return {
                text: 'text-yellow-600',
                bg: 'bg-yellow-50',
                border: 'border-yellow-200',
                label: 'Cho thanh toan',
            }
        case 'cancelled':
            return {
                text: 'text-red-600',
                bg: 'bg-red-50',
                border: 'border-red-200',
                label: 'Da huy',
            }
        case 'expired':
            return {
                text: 'text-gray-600',
                bg: 'bg-gray-50',
                border: 'border-gray-200',
                label: 'Het han',
            }
        default:
            return {
                text: 'text-gray-600',
                bg: 'bg-gray-50',
                border: 'border-gray-200',
                label: status,
            }
    }
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(amount)
}

export function MyBookingsScreen() {
    const router = useRouter()
    const logout = useAuthStore((state) => state.logout)
    const user = useAuthStore((state) => state.user)
    const { data, isLoading } = useMyBookings({ page: 1, pageSize: 20 })
    const cancelBooking = useCancelBooking()

    const copyCode = async (code: string) => {
        try {
            await navigator.clipboard?.writeText?.(code)
        } catch {
            Alert.alert('Khong the copy', 'Thiet bi khong ho tro copy trong che do nay.')
        }
    }

    const handleCancelBooking = (booking: Booking) => {
        Alert.alert('Xac nhan huy ve', `Ban co chac chan huy ve ${booking.code}?`, [
            { text: 'Khong' },
            {
                text: 'Huy ve',
                style: 'destructive',
                onPress: () => {
                    cancelBooking.mutate(booking.id)
                },
            },
        ])
    }

    const renderBookingCard = ({ item }: { item: Booking }) => {
        const badge = getStatusBadgeStyle(item.status)
        const canRefund = item.status === 'paid' && getRefundRemainingMs(item) > 0

        return (
            <View style={tw`mb-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm`}>
                <View style={tw`mb-3 flex-row items-center justify-between`}>
                    <TouchableOpacity onPress={() => void copyCode(item.code)}>
                        <View style={tw`flex-row items-center`}>
                            <Text style={tw`text-sm text-gray-500`}>Ma: <Text style={tw`font-bold text-gray-900`}>{item.code}</Text></Text>
                            <Copy size={13} color="#6B7280" style={tw`ml-1`} />
                        </View>
                    </TouchableOpacity>
                    <View style={tw`rounded-md border px-2 py-1 ${badge.bg} ${badge.border}`}>
                        <Text style={tw`text-xs font-semibold ${badge.text}`}>{badge.label}</Text>
                    </View>
                </View>

                <View style={tw`mb-3 flex-row items-center`}>
                    <Text style={tw`text-sm text-gray-600`}>{item.originName ?? '-'}</Text>
                    <ArrowRight size={14} color="#9CA3AF" style={tw`mx-2`} />
                    <Text style={tw`text-sm text-gray-600`}>{item.destinationName ?? '-'}</Text>
                </View>

                {!!item.departureTime && (
                    <View style={tw`mb-3 flex-row items-center`}>
                        <Clock size={14} color="#6B7280" />
                        <Text style={tw`ml-1 text-xs text-gray-500`}>
                            {new Date(item.departureTime).toLocaleString('vi-VN')}
                        </Text>
                    </View>
                )}

                <View style={tw`mb-3 flex-row flex-wrap`}>
                    {item.seatCodes?.map((seat) => (
                        <View key={seat} style={tw`mb-1 mr-1 rounded-md bg-slate-100 px-2 py-1`}>
                            <Text style={tw`text-xs font-medium text-slate-700`}>{seat}</Text>
                        </View>
                    ))}
                </View>

                <View style={tw`rounded-lg bg-gray-50 p-3`}>
                    <Text style={tw`text-gray-600`}>Tong tien</Text>
                    <Text style={tw`mt-1 text-lg font-bold text-blue-600`}>{formatCurrency(item.totalAmount)}</Text>
                </View>

                {!!item.originName && !!item.destinationName && (
                    <Text style={tw`mt-3 text-sm text-gray-600`}>
                        {item.originName} - {item.destinationName}
                    </Text>
                )}

                {item.status === 'paid' && (
                    <Text style={tw`mt-2 text-xs font-medium text-orange-600`}>
                        Hoan ve trong: {formatCountdown(getRefundRemainingMs(item))}
                    </Text>
                )}

                {item.status === 'pending' && (
                    <View style={tw`mt-3 flex-row`}>
                        <TouchableOpacity
                            style={tw`mr-2 flex-1 rounded-lg border border-red-200 bg-red-50 py-2`}
                            onPress={() => handleCancelBooking(item)}
                        >
                            <View style={tw`flex-row items-center justify-center`}>
                                <XCircle size={14} color="#DC2626" />
                                <Text style={tw`ml-1 text-sm font-semibold text-red-600`}>Huy ve</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={tw`flex-1 rounded-lg border border-blue-200 bg-blue-50 py-2`}
                            onPress={() => {
                                const encodedCode = encodeURIComponent(item.code)
                                const nextPath = item.orderCode
                                    ? `/payment/${encodedCode}?orderCode=${encodeURIComponent(item.orderCode)}`
                                    : `/payment/${encodedCode}`
                                router.push(nextPath as never)
                            }}
                        >
                            <View style={tw`flex-row items-center justify-center`}>
                                <Undo2 size={14} color="#2563EB" />
                                <Text style={tw`ml-1 text-sm font-semibold text-blue-600`}>Tiep tuc TT</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                {canRefund && (
                    <TouchableOpacity
                        style={tw`mt-3 rounded-lg border border-orange-200 bg-orange-50 py-2`}
                        onPress={() => Alert.alert('Thong bao', 'Flow refund user se bo sung tiep theo backend policy.')}
                    >
                        <View style={tw`flex-row items-center justify-center`}>
                            <Undo2 size={14} color="#EA580C" />
                            <Text style={tw`ml-1 text-sm font-semibold text-orange-600`}>Yeu cau hoan ve</Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>
        )
    }

    return (
        <SafeAreaView style={tw`flex-1 bg-gray-50`}>
            <View style={tw`border-b border-gray-100 bg-white px-4 py-4 shadow-sm`}>
                <Text style={tw`text-xl font-bold text-gray-900`}>Ve cua toi</Text>
                <Text style={tw`mt-1 text-xs text-gray-500`}>
                    {user?.fullName ? `Xin chao ${user.fullName}. ` : ''}
                    Quan ly ve da dat, thanh toan va huy/hoan ve
                </Text>
                <TouchableOpacity
                    style={tw`mt-3 self-start rounded-lg border border-gray-200 bg-gray-50 px-3 py-2`}
                    onPress={() => {
                        logout()
                        router.replace('/login')
                    }}
                >
                    <Text style={tw`text-xs font-semibold text-gray-700`}>Dang xuat</Text>
                </TouchableOpacity>
            </View>

            <View style={tw`flex-1 px-4 pt-4`}>
                {isLoading ? (
                    <View style={tw`flex-1 items-center justify-center`}>
                        <ActivityIndicator size="large" color="#3B82F6" />
                    </View>
                ) : !data || data.items.length === 0 ? (
                    <View style={tw`flex-1 items-center justify-center`}>
                        <Ticket size={48} color="#9CA3AF" style={tw`mb-4`} />
                        <Text style={tw`text-center text-lg text-gray-500`}>Ban chua co ve nao.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={data.items}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderBookingCard}
                        contentContainerStyle={tw`pb-20`}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </SafeAreaView>
    )
}
