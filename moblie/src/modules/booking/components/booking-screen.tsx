import { useEffect, useMemo, useState } from 'react'
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'

import { userTheme } from '@/src/constants/user-theme'
import { ResponsiveFrame } from '@/src/components/common/responsive-frame'
import { tw } from '@/src/lib/utils'
import { usePublicTrip } from '@/src/modules/trip'
import { useAuthStore } from '@/src/stores/use-auth-store'

import { useCreateBooking } from '../hooks'
import type { CreateBookingResponse, PaymentMethod } from '../types'

import { BookingSuccessScreen } from './booking-success-screen'
import { SeatMapMobile } from './seat-map-mobile'

const PAYMENT_OPTIONS: { label: string; value: PaymentMethod }[] = [
    { label: 'Chuyển khoản ngân hàng', value: 'bank_transfer' },
    { label: 'Thanh toán khi lên xe (COD)', value: 'cod' },
]

export function BookingScreen() {
    const router = useRouter()
    const user = useAuthStore((state) => state.user)
    const { id, passengers } = useLocalSearchParams()
    const tripId = Number(id)
    const requiredPassengers = Math.max(Number(passengers ?? 1), 1)

    const { data: trip, isLoading: isTripLoading } = usePublicTrip(tripId)
    const { mutateAsync: createBooking, isPending: isSubmitting } = useCreateBooking()

    const [name, setName] = useState(user?.fullName ?? '')
    const [phone, setPhone] = useState(user?.phone ?? '')
    const [email, setEmail] = useState(user?.email ?? '')
    const [selectedSeat, setSelectedSeat] = useState<string>('')
    const [selectedSeats, setSelectedSeats] = useState<string[]>([])
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer')
    const [bookingResponse, setBookingResponse] = useState<CreateBookingResponse | null>(null)

    const availableSeatOptions = useMemo(() => {
        if (!trip?.seatLayout?.seats || trip.seatLayout.seats.length === 0) {
            return []
        }
        const booked = new Set(trip.bookedSeats ?? [])
        return trip.seatLayout.seats.filter((seatCode) => !booked.has(seatCode))
    }, [trip])

    useEffect(() => {
        if (!selectedSeat && availableSeatOptions.length > 0) {
            setSelectedSeat(availableSeatOptions[0])
        }
    }, [availableSeatOptions, selectedSeat])

    useEffect(() => {
        if (selectedSeat && selectedSeats.length === 0) {
            setSelectedSeats([selectedSeat])
        }
    }, [selectedSeat, selectedSeats.length])

    const onSubmit = async () => {
        if (!trip) {
            return
        }
        if (!name.trim() || !phone.trim()) {
            Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ tên và số điện thoại.')
            return
        }
        if (selectedSeats.length === 0) {
            Alert.alert('Chưa chọn ghế', 'Vui lòng chọn ghế hợp lệ để đặt vé.')
            return
        }

        const pickupPoint = trip.pickupPoints?.[0]
        const dropoffPoint = trip.dropoffPoints?.[0]

        if (!pickupPoint || !dropoffPoint) {
            Alert.alert('Thiếu dữ liệu', 'Không tìm thấy điểm đón/trả của chuyến xe.')
            return
        }

        try {
            const result = await createBooking({
                tripId,
                seatCodes: selectedSeats,
                guestInfo: {
                    name: name.trim(),
                    phone: phone.trim(),
                    email: email.trim() || undefined,
                },
                pickupInfo: {
                    name: pickupPoint.name,
                    time: pickupPoint.time,
                    surcharge: pickupPoint.surcharge,
                },
                dropoffInfo: {
                    name: dropoffPoint.name,
                    time: dropoffPoint.time,
                    surcharge: dropoffPoint.surcharge,
                },
                paymentMethod,
            })

            setBookingResponse(result)

            if (paymentMethod === 'cod') {
                Alert.alert('Thành công', 'Đặt vé thành công!')
            }
        } catch {
            Alert.alert('Lỗi', 'Có lỗi xảy ra khi đặt vé')
        }
    }

    if (isTripLoading) {
        return (
            <View style={tw`flex-1 items-center justify-center`}>
                <ActivityIndicator size="large" color={userTheme.colors.primaryStrong} />
            </View>
        )
    }

    if (!trip) {
        return (
            <SafeAreaView style={[tw`flex-1 items-center justify-center p-4`, { backgroundColor: userTheme.colors.background }]}>
                <Text style={tw`text-center text-base text-gray-600`}>Không tìm thấy chuyến xe.</Text>
                <TouchableOpacity style={[tw`mt-4 rounded-xl px-6 py-3`, { backgroundColor: userTheme.colors.primaryStrong }]} onPress={() => router.back()}>
                    <Text style={tw`font-bold text-white`}>Quay lại</Text>
                </TouchableOpacity>
            </SafeAreaView>
        )
    }

    if (bookingResponse) {
        return (
            <SafeAreaView style={[tw`flex-1`, { backgroundColor: userTheme.colors.background }]}> 
                <BookingSuccessScreen
                    data={bookingResponse}
                    onReset={() => {
                        setBookingResponse(null)
                    }}
                />
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={[tw`flex-1`, { backgroundColor: userTheme.colors.background }]}> 
            <View style={[tw`bg-white px-4 py-3`, { borderBottomColor: userTheme.colors.border, borderBottomWidth: 1 }]}> 
                <Text style={[tw`text-lg font-bold`, { color: userTheme.colors.text }]}>Xác nhận đặt vé</Text>
                <Text style={[tw`text-xs`, { color: userTheme.colors.mutedText }]}>{trip.originName} - {trip.destinationName}</Text>
                <Text style={[tw`text-xs`, { color: userTheme.colors.mutedText }]}>Số hành khách: {requiredPassengers}</Text>
            </View>

            <ScrollView contentContainerStyle={tw`pb-20`}>
                <ResponsiveFrame style={tw`pt-4`}>
                <View style={[tw`mb-4 rounded-2xl p-3`, { borderColor: '#BEECD8', borderWidth: 1, backgroundColor: '#ECFDF5' }]}> 
                        <Text style={tw`text-xs text-emerald-700`}>
                        Đặt chỗ đang được giữ tạm thời. Vui lòng hoàn tất thông tin để tránh mất chỗ.
                    </Text>
                </View>

                <View style={[tw`mb-4 rounded-2xl bg-white p-4`, { borderColor: userTheme.colors.border, borderWidth: 1 }]}>
                    <Text style={[tw`mb-3 text-base font-bold`, { color: userTheme.colors.text }]}>Thông tin liên hệ</Text>

                    <Text style={[tw`mb-1 text-xs`, { color: userTheme.colors.mutedText }]}>Họ tên</Text>
                    <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="Nhập họ tên"
                        style={[tw`mb-3 rounded-xl px-3 py-3 text-base`, { borderColor: userTheme.colors.border, borderWidth: 1, color: userTheme.colors.text }]}
                    />

                    <Text style={[tw`mb-1 text-xs`, { color: userTheme.colors.mutedText }]}>Số điện thoại</Text>
                    <TextInput
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="Nhập số điện thoại"
                        keyboardType="phone-pad"
                        style={[tw`mb-3 rounded-xl px-3 py-3 text-base`, { borderColor: userTheme.colors.border, borderWidth: 1, color: userTheme.colors.text }]}
                    />

                    <Text style={[tw`mb-1 text-xs`, { color: userTheme.colors.mutedText }]}>Email (tùy chọn)</Text>
                    <TextInput
                        value={email}
                        onChangeText={setEmail}
                        placeholder="email@example.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        style={[tw`rounded-xl px-3 py-3 text-base`, { borderColor: userTheme.colors.border, borderWidth: 1, color: userTheme.colors.text }]}
                    />
                </View>

                <View style={[tw`mb-4 rounded-2xl bg-white p-4`, { borderColor: userTheme.colors.border, borderWidth: 1 }]}>
                    <Text style={[tw`mb-3 text-base font-bold`, { color: userTheme.colors.text }]}>Chọn ghế</Text>
                    {availableSeatOptions.length === 0 ? (
                        <Text style={tw`text-gray-500`}>Không còn ghế trống.</Text>
                    ) : (
                        trip.seatLayout ? (
                            <SeatMapMobile
                                layout={trip.seatLayout}
                                bookedSeats={trip.bookedSeats ?? []}
                                selectedSeats={selectedSeats}
                                maxSeats={Math.max(requiredPassengers, 1)}
                                onSelectionChange={(seats) => {
                                    setSelectedSeats(seats)
                                    setSelectedSeat(seats[0] ?? '')
                                }}
                            />
                        ) : (
                            <View style={tw`flex-row flex-wrap`}>
                                {availableSeatOptions.slice(0, 30).map((seatCode) => {
                                    const isSelected = selectedSeat === seatCode
                                    return (
                                        <TouchableOpacity
                                            key={seatCode}
                                            style={tw`${isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'} mb-2 mr-2 rounded-lg border px-3 py-2`}
                                            onPress={() => {
                                                setSelectedSeat(seatCode)
                                                setSelectedSeats([seatCode])
                                            }}
                                        >
                                            <Text style={tw`${isSelected ? 'text-blue-700' : 'text-gray-700'} font-medium`}>
                                                {seatCode}
                                            </Text>
                                        </TouchableOpacity>
                                    )
                                })}
                            </View>
                        )
                    )}
                </View>

                <View style={[tw`mb-4 rounded-2xl bg-white p-4`, { borderColor: userTheme.colors.border, borderWidth: 1 }]}>
                    <Text style={[tw`mb-3 text-base font-bold`, { color: userTheme.colors.text }]}>Phương thức thanh toán</Text>
                    <View style={tw`flex-row flex-wrap`}>
                        {PAYMENT_OPTIONS.map((option) => {
                            const isSelected = option.value === paymentMethod
                            return (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        tw`mb-2 mr-2 rounded-lg border px-3 py-2`,
                                        isSelected
                                            ? { borderColor: userTheme.colors.primaryStrong, backgroundColor: userTheme.colors.primarySoft }
                                            : { borderColor: userTheme.colors.border, backgroundColor: userTheme.colors.surface },
                                    ]}
                                    onPress={() => setPaymentMethod(option.value)}
                                >
                                    <Text style={[tw`font-medium`, { color: isSelected ? userTheme.colors.primaryStrong : userTheme.colors.text }]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                </View>

                <View style={[tw`rounded-2xl p-4`, { borderColor: userTheme.colors.primary, borderWidth: 1, backgroundColor: userTheme.colors.primarySoft }]}>
                    <Text style={[tw`text-sm`, { color: userTheme.colors.mutedText }]}>Tổng tiền</Text>
                    <Text style={[tw`mt-1 text-2xl font-bold`, { color: userTheme.colors.primaryStrong }]}> 
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(trip.finalPrice * Math.max(selectedSeats.length, 1))}
                    </Text>

                    <TouchableOpacity
                        style={[
                            tw`mt-4 rounded-xl py-4`,
                            { backgroundColor: isSubmitting || selectedSeats.length === 0 ? '#7CDDD9' : userTheme.colors.primaryStrong },
                        ]}
                        onPress={onSubmit}
                        disabled={isSubmitting || selectedSeats.length === 0}
                    >
                        <Text style={tw`text-center text-base font-bold text-white`}>
                            {isSubmitting ? 'Đang đặt vé...' : 'Xác nhận đặt vé'}
                        </Text>
                    </TouchableOpacity>
                </View>
                </ResponsiveFrame>
            </ScrollView>
        </SafeAreaView>
    )
}
