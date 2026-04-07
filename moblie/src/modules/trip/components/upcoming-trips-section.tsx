import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { ArrowRight, Clock, Flame, MapPin, Ticket, Users } from 'lucide-react-native'

import { userTheme } from '@/src/constants/user-theme'
import { tw } from '@/src/lib/utils'

import { useBrowseTrips } from '../hooks'
import type { Trip } from '../types'

function formatTime(dateStr: string) {
    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) {
        return dateStr
    }
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) {
        return dateStr
    }
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

function formatVndCurrency(amount: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

function getDuration(departure: string, arrival: string) {
    const diff = new Date(arrival).getTime() - new Date(departure).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h${minutes > 0 ? `${minutes}m` : ''}`
}

function TripCard({ trip }: { trip: Trip }) {
    const router = useRouter()

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            style={[tw`mb-4 overflow-hidden rounded-2xl bg-white shadow-sm`, { borderColor: userTheme.colors.border, borderWidth: 1 }]}
            onPress={() =>
                router.push({
                    pathname: '/booking/[id]',
                    params: { id: trip.id.toString(), passengers: '1' },
                })
            }
        >
            <View style={tw`h-36 w-full bg-slate-200`}>
                {trip.busImageUrl ? (
                    <Image source={{ uri: trip.busImageUrl }} style={tw`h-full w-full`} resizeMode="cover" />
                ) : (
                    <View style={tw`h-full w-full items-center justify-center`}>
                        <Text style={tw`text-xs text-slate-500`}>Bus image</Text>
                    </View>
                )}
            </View>

            <View style={tw`p-4`}>
                <View style={tw`mb-2 flex-row items-center justify-between`}>
                    <View style={tw`mr-2 flex-row items-center`}>
                        <Ticket size={14} color="#6B7280" />
                        <Text style={tw`ml-1 text-sm font-medium text-gray-600`}>{trip.providerName}</Text>
                    </View>
                    {!!trip.isHotDeal && (
                        <View style={tw`flex-row items-center rounded-full bg-red-50 px-2 py-1`}>
                            <Flame size={12} color="#DC2626" />
                            <Text style={tw`ml-1 text-xs font-semibold text-red-600`}>Hot</Text>
                        </View>
                    )}
                </View>

                <View style={tw`mb-3 flex-row items-center`}>
                    <MapPin size={14} color="#3B82F6" />
                    <Text numberOfLines={1} style={tw`mx-1 flex-1 text-sm font-medium text-gray-800`}>
                        {trip.originName}
                    </Text>
                    <ArrowRight size={14} color="#9CA3AF" />
                    <Text numberOfLines={1} style={tw`mx-1 flex-1 text-right text-sm font-medium text-gray-800`}>
                        {trip.destinationName}
                    </Text>
                </View>

                <View style={tw`mb-3 flex-row items-center`}>
                    <Text style={tw`text-lg font-bold text-gray-900`}>{formatTime(trip.departureTime)}</Text>
                    <Text style={tw`ml-2 text-xs text-gray-500`}>{formatDate(trip.departureTime)}</Text>
                    <View style={tw`ml-auto flex-row items-center`}>
                        <Clock size={12} color="#6B7280" />
                        <Text style={tw`ml-1 text-xs text-gray-500`}>
                            {getDuration(trip.departureTime, trip.arrivalTime)}
                        </Text>
                    </View>
                </View>

                <View style={tw`flex-row items-center justify-between`}>
                    <View>
                        {!!trip.isHotDeal && trip.finalPrice < trip.basePrice && (
                            <Text style={tw`text-xs text-gray-400 line-through`}>{formatVndCurrency(trip.basePrice)}</Text>
                        )}
                        <Text style={[tw`text-lg font-bold`, { color: userTheme.colors.primaryStrong }]}>{formatVndCurrency(trip.finalPrice)}</Text>
                    </View>
                    <View style={tw`flex-row items-center`}>
                        <Users size={14} color={trip.availableSeats <= 5 ? '#D97706' : '#16A34A'} />
                        <Text style={tw`${trip.availableSeats <= 5 ? 'text-amber-600' : 'text-green-600'} ml-1 text-xs font-medium`}>
                            Con {trip.availableSeats} cho
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    )
}

export function UpcomingTripsSection() {
    const { data, isLoading } = useBrowseTrips({ page: 1, limit: 12 })

    if (isLoading) {
        return (
            <View style={tw`mt-6`}>
                <Text style={tw`mb-3 text-lg font-bold text-gray-900`}>Chuyen xe sap khoi hanh</Text>
                <View style={tw`rounded-2xl border border-gray-100 bg-white p-4`}>
                    <Text style={tw`text-gray-500`}>Dang tai danh sach chuyen...</Text>
                </View>
            </View>
        )
    }

    const trips = data?.items ?? []
    if (trips.length === 0) {
        return null
    }

    return (
        <View style={tw`mt-6`}>
            <Text style={tw`mb-3 text-lg font-bold text-gray-900`}>Chuyen xe sap khoi hanh</Text>
            <FlatList
                data={trips}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => <TripCard trip={item} />}
                scrollEnabled={false}
            />
        </View>
    )
}
