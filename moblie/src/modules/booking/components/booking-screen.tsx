import { useEffect, useMemo, useState } from 'react'
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'

import { tw } from '@/src/lib/utils'
import { usePublicTrip } from '@/src/modules/trip'

import { useCreateBooking } from '../hooks'
import type { CreateBookingResponse, PaymentMethod } from '../types'

import { BookingSuccessScreen } from './booking-success-screen'
import { SeatMapMobile } from './seat-map-mobile'

const PAYMENT_OPTIONS: { label: string; value: PaymentMethod }[] = [
    { label: 'Chuyen khoan ngan hang', value: 'bank_transfer' },
    { label: 'Thanh toan khi len xe (COD)', value: 'cod' },
]

export function BookingScreen() {
    const router = useRouter()
    const { id, passengers } = useLocalSearchParams()
    const tripId = Number(id)
    const requiredPassengers = Math.max(Number(passengers ?? 1), 1)

    const { data: trip, isLoading: isTripLoading } = usePublicTrip(tripId)
    const { mutateAsync: createBooking, isPending: isSubmitting } = useCreateBooking()

    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')
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
            Alert.alert('Thieu thong tin', 'Vui long nhap ho ten va so dien thoai.')
            return
        }
        if (selectedSeats.length === 0) {
            Alert.alert('Chua chon ghe', 'Vui long chon ghe hop le de dat ve.')
            return
        }

        const pickupPoint = trip.pickupPoints?.[0]
        const dropoffPoint = trip.dropoffPoints?.[0]

        if (!pickupPoint || !dropoffPoint) {
            Alert.alert('Thieu du lieu', 'Khong tim thay diem don/tra cua chuyen xe.')
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
                Alert.alert('Thanh cong', 'Dat ve thanh cong!')
            }
        } catch {
            Alert.alert('Loi', 'Co loi xay ra khi dat ve')
        }
    }

    if (isTripLoading) {
        return (
            <View style={tw`flex-1 items-center justify-center`}>
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        )
    }

    if (!trip) {
        return (
            <SafeAreaView style={tw`flex-1 items-center justify-center bg-gray-50 p-4`}>
                <Text style={tw`text-center text-base text-gray-600`}>Khong tim thay chuyen xe.</Text>
                <TouchableOpacity style={tw`mt-4 rounded-xl bg-blue-600 px-6 py-3`} onPress={() => router.back()}>
                    <Text style={tw`font-bold text-white`}>Quay lai</Text>
                </TouchableOpacity>
            </SafeAreaView>
        )
    }

    if (bookingResponse) {
        return (
            <SafeAreaView style={tw`flex-1 bg-gray-50`}>
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
        <SafeAreaView style={tw`flex-1 bg-gray-50`}>
            <View style={tw`border-b border-gray-100 bg-white px-4 py-3`}>
                <Text style={tw`text-lg font-bold text-gray-900`}>Xac nhan dat ve</Text>
                <Text style={tw`text-xs text-gray-500`}>{trip.originName} - {trip.destinationName}</Text>
                <Text style={tw`text-xs text-gray-500`}>So hanh khach: {requiredPassengers}</Text>
            </View>

            <ScrollView contentContainerStyle={tw`p-4 pb-20`}>
                <View style={tw`mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-3`}>
                    <Text style={tw`text-xs text-emerald-700`}>
                        Dat cho dang duoc giu tam thoi. Vui long hoan tat thong tin de tranh mat cho.
                    </Text>
                </View>

                <View style={tw`mb-4 rounded-2xl border border-gray-100 bg-white p-4`}>
                    <Text style={tw`mb-3 text-base font-bold text-gray-900`}>Thong tin lien he</Text>

                    <Text style={tw`mb-1 text-xs text-gray-500`}>Ho ten</Text>
                    <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="Nhap ho ten"
                        style={tw`mb-3 rounded-xl border border-gray-200 px-3 py-3 text-base text-gray-900`}
                    />

                    <Text style={tw`mb-1 text-xs text-gray-500`}>So dien thoai</Text>
                    <TextInput
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="Nhap so dien thoai"
                        keyboardType="phone-pad"
                        style={tw`mb-3 rounded-xl border border-gray-200 px-3 py-3 text-base text-gray-900`}
                    />

                    <Text style={tw`mb-1 text-xs text-gray-500`}>Email (tuy chon)</Text>
                    <TextInput
                        value={email}
                        onChangeText={setEmail}
                        placeholder="email@example.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        style={tw`rounded-xl border border-gray-200 px-3 py-3 text-base text-gray-900`}
                    />
                </View>

                <View style={tw`mb-4 rounded-2xl border border-gray-100 bg-white p-4`}>
                    <Text style={tw`mb-3 text-base font-bold text-gray-900`}>Chon ghe</Text>
                    {availableSeatOptions.length === 0 ? (
                        <Text style={tw`text-gray-500`}>Khong con ghe trong.</Text>
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

                <View style={tw`mb-4 rounded-2xl border border-gray-100 bg-white p-4`}>
                    <Text style={tw`mb-3 text-base font-bold text-gray-900`}>Phuong thuc thanh toan</Text>
                    <View style={tw`flex-row flex-wrap`}>
                        {PAYMENT_OPTIONS.map((option) => {
                            const isSelected = option.value === paymentMethod
                            return (
                                <TouchableOpacity
                                    key={option.value}
                                    style={tw`${isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'} mb-2 mr-2 rounded-lg border px-3 py-2`}
                                    onPress={() => setPaymentMethod(option.value)}
                                >
                                    <Text style={tw`${isSelected ? 'text-blue-700' : 'text-gray-700'} font-medium`}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                </View>

                <View style={tw`rounded-2xl border border-blue-100 bg-blue-50 p-4`}>
                    <Text style={tw`text-sm text-gray-600`}>Tong tien</Text>
                    <Text style={tw`mt-1 text-2xl font-bold text-blue-700`}>
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(trip.finalPrice * Math.max(selectedSeats.length, 1))}
                    </Text>

                    <TouchableOpacity
                        style={tw`${isSubmitting || selectedSeats.length === 0 ? 'bg-blue-300' : 'bg-blue-600'} mt-4 rounded-xl py-4`}
                        onPress={onSubmit}
                        disabled={isSubmitting || selectedSeats.length === 0}
                    >
                        <Text style={tw`text-center text-base font-bold text-white`}>
                            {isSubmitting ? 'Dang dat ve...' : 'Xac nhan dat ve'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}
