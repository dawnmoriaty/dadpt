import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowRight, Calendar, ChevronLeft, Clock, Users } from 'lucide-react-native'

import { userTheme } from '@/src/constants/user-theme'
import { ResponsiveFrame } from '@/src/components/common/responsive-frame'
import { tw } from '@/src/lib/utils'

import { useSearchTrips } from '../hooks'
import type { Trip } from '../types'

function getDuration(departure: string, arrival: string) {
    const diff = new Date(arrival).getTime() - new Date(departure).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h${minutes > 0 ? `${minutes}m` : ''}`
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(amount)
}

export function SearchResultsScreen() {
    const router = useRouter()
    const searchParams = useLocalSearchParams()

    const originId = Number(searchParams.originId ?? 0)
    const destinationId = Number(searchParams.destinationId ?? 0)
    const originName = (searchParams.originName as string) || ''
    const destinationName = (searchParams.destinationName as string) || ''
    const departureDate = (searchParams.date as string) || ''
    const passengers = Number(searchParams.passengers ?? 1)

    const { data, isLoading, error } = useSearchTrips({
        originId,
        destinationId,
        departureDate,
        minSeats: passengers,
    })

    const handleBookTrip = (tripId: number) => {
        router.push({
            pathname: '/booking/[id]',
            params: {
                id: tripId.toString(),
                passengers: passengers.toString(),
            },
        })
    }

    const renderTripCard = ({ item: trip }: { item: Trip }) => (
        <View style={[tw`mb-4 rounded-2xl bg-white p-4 shadow-sm`, { borderColor: userTheme.colors.border, borderWidth: 1 }]}>
            <View style={tw`mb-4 flex-row items-start justify-between`}>
                <View style={tw`flex-1 pr-3`}>
                    <Text style={tw`text-lg font-bold text-gray-900`}>{trip.providerName}</Text>
                    <View style={tw`mt-1 flex-row items-center`}>
                        <Clock size={14} color="#6B7280" />
                        <Text style={tw`ml-1 text-sm text-gray-500`}>
                            {new Date(trip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            {' - '}
                            {new Date(trip.arrivalTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                    <Text style={tw`mt-1 text-xs text-gray-400`}>
                        Thời gian di chuyển: {getDuration(trip.departureTime, trip.arrivalTime)}
                    </Text>
                </View>
                <Text style={[tw`text-right text-xl font-bold`, { color: userTheme.colors.primaryStrong }]}>{formatCurrency(trip.finalPrice)}</Text>
            </View>

            <View style={tw`flex-row items-center justify-between`}>
                <View style={tw`flex-row items-center`}>
                    <Users size={16} color="#10B981" />
                    <Text style={tw`ml-1 text-sm font-medium text-emerald-600`}>Con {trip.availableSeats} cho</Text>
                </View>

                <TouchableOpacity
                    style={[tw`rounded-lg px-4 py-2`, { backgroundColor: userTheme.colors.primarySoft }]}
                    onPress={() => handleBookTrip(trip.id)}
                >
                    <Text style={[tw`font-bold`, { color: userTheme.colors.primaryStrong }]}>Chọn chuyến</Text>
                </TouchableOpacity>
            </View>
        </View>
    )

    return (
        <SafeAreaView style={[tw`flex-1`, { backgroundColor: userTheme.colors.background }]}> 
            <View style={[tw`z-10 flex-row items-center bg-white px-4 py-3 shadow-sm`, { borderBottomColor: userTheme.colors.border, borderBottomWidth: 1 }]}> 
                <TouchableOpacity onPress={() => router.back()} style={tw`mr-4 p-1`}>
                    <ChevronLeft size={24} color={userTheme.colors.text} />
                </TouchableOpacity>
                <View style={tw`flex-1 flex-row items-center`}>
                    <Text style={tw`text-base font-bold text-gray-900`} numberOfLines={1}>{originName}</Text>
                    <ArrowRight size={16} color="#4B5563" style={tw`mx-2`} />
                    <Text style={tw`text-base font-bold text-gray-900`} numberOfLines={1}>{destinationName}</Text>
                </View>
            </View>

            <View style={[tw`flex-row items-center px-4 py-2`, { backgroundColor: userTheme.colors.primarySoft }]}> 
                <Calendar size={16} color={userTheme.colors.primaryStrong} />
                <Text style={[tw`ml-2 font-medium`, { color: userTheme.colors.primaryStrong }]}>{departureDate}</Text>
            </View>

            <View style={tw`flex-1 pt-4`}>
                <ResponsiveFrame style={tw`flex-1`}>
                {isLoading ? (
                    <View style={tw`flex-1 items-center justify-center`}>
                        <ActivityIndicator size="large" color={userTheme.colors.primaryStrong} />
                        <Text style={tw`mt-4 text-gray-500`}>Đang tìm chuyến xe...</Text>
                    </View>
                ) : error ? (
                    <View style={tw`flex-1 items-center justify-center`}>
                        <Text style={tw`text-center text-red-500`}>Có lỗi xảy ra khi tải dữ liệu.</Text>
                        <TouchableOpacity style={tw`mt-4 rounded bg-gray-200 px-4 py-2`} onPress={() => router.back()}>
                            <Text>Quay lại</Text>
                        </TouchableOpacity>
                    </View>
                ) : !data || data.items.length === 0 ? (
                    <View style={tw`flex-1 items-center justify-center`}>
                        <Text style={tw`text-center text-lg text-gray-500`}>Không tìm thấy chuyến xe phù hợp.</Text>
                        <TouchableOpacity style={[tw`mt-4 rounded-xl px-6 py-3`, { backgroundColor: userTheme.colors.primaryStrong }]} onPress={() => router.back()}>
                            <Text style={tw`font-bold text-white`}>Tìm ngày khác</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <View style={tw`mb-3 rounded-xl bg-white px-3 py-2`}>
                            <Text style={tw`text-xs text-gray-500`}>Tìm thấy {data.items.length} chuyến phù hợp</Text>
                        </View>
                        <FlatList
                            data={data.items}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={renderTripCard}
                            contentContainerStyle={tw`pb-10`}
                            showsVerticalScrollIndicator={false}
                        />
                    </>
                )}
                </ResponsiveFrame>
            </View>
        </SafeAreaView>
    )
}
