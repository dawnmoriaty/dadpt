import { useMemo, useState } from 'react'
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Calendar, MapPin, Search, Shield, Users } from 'lucide-react-native'

import { tw } from '@/src/lib/utils'
import { useSearchLocations, type Location } from '@/src/modules/location'

import { UpcomingTripsSection } from './upcoming-trips-section'

function normalizeDateInput(input: string) {
    return input.trim()
}

function isValidDateInput(input: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(input)
}

interface LocationInputProps {
    label: string
    placeholder: string
    value: string
    onChangeText: (value: string) => void
    selected: Location | null
    onPick: (location: Location) => void
    options: Location[]
    iconColor: string
}

function LocationInput({
    label,
    placeholder,
    value,
    onChangeText,
    selected,
    onPick,
    options,
    iconColor,
}: LocationInputProps) {
    const showOptions = value.trim().length >= 2 && !selected

    return (
        <View style={tw`mb-4`}>
            <Text style={tw`text-xs text-gray-500 mb-1`}>{label}</Text>
            <View style={tw`flex-row items-center rounded-xl border border-gray-200 bg-white px-3 py-3`}>
                <MapPin size={18} color={iconColor} />
                <TextInput
                    style={tw`ml-2 flex-1 text-base font-medium text-gray-900`}
                    placeholder={placeholder}
                    value={value}
                    onChangeText={onChangeText}
                />
            </View>
            {selected && (
                <Text style={tw`mt-1 text-xs text-emerald-700`}>
                    Da chon: {selected.name} ({selected.city})
                </Text>
            )}
            {showOptions && options.length > 0 && (
                <View style={tw`mt-2 rounded-xl border border-gray-200 bg-white`}>
                    {options.slice(0, 5).map((option) => (
                        <TouchableOpacity
                            key={option.id}
                            style={tw`border-b border-gray-100 px-3 py-3`}
                            onPress={() => onPick(option)}
                        >
                            <Text style={tw`font-medium text-gray-900`}>{option.name}</Text>
                            <Text style={tw`text-xs text-gray-500`}>{option.city}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    )
}

export function HomeSearchScreen() {
    const router = useRouter()

    const [originQuery, setOriginQuery] = useState('')
    const [destinationQuery, setDestinationQuery] = useState('')
    const [originLocation, setOriginLocation] = useState<Location | null>(null)
    const [destinationLocation, setDestinationLocation] = useState<Location | null>(null)
    const [departureDate, setDepartureDate] = useState('')

    const originSearch = useSearchLocations(originQuery)
    const destinationSearch = useSearchLocations(destinationQuery)

    const canSearch = useMemo(() => {
        return !!originLocation && !!destinationLocation && isValidDateInput(departureDate)
    }, [originLocation, destinationLocation, departureDate])

    const handleSearch = () => {
        if (!canSearch || !originLocation || !destinationLocation) {
            return
        }

        router.push({
            pathname: '/search-results',
            params: {
                originId: originLocation.id.toString(),
                destinationId: destinationLocation.id.toString(),
                originName: originLocation.name,
                destinationName: destinationLocation.name,
                date: departureDate,
                passengers: '1',
            },
        })
    }

    return (
        <SafeAreaView style={tw`flex-1 bg-gray-50`}>
            <ScrollView contentContainerStyle={tw`p-4 pb-10`}>
                <View style={tw`mt-4 mb-6 rounded-3xl border border-blue-500 bg-blue-600 p-6 shadow-sm`}>
                    <View style={tw`mb-2 self-start rounded-full bg-white/20 px-3 py-1`}>
                        <Text style={tw`text-xs font-semibold text-white`}>Bus Ticketing</Text>
                    </View>
                    <Text style={tw`mb-1 text-2xl font-bold text-white`}>Dat ve xe khach</Text>
                    <Text style={tw`text-blue-100`}>Tim chuyen nhanh, dat cho de dang va an toan</Text>
                </View>

                <View style={tw`rounded-3xl border border-gray-100 bg-white p-4 shadow-sm`}>
                    <LocationInput
                        label="Diem di"
                        placeholder="Nhap diem di"
                        value={originQuery}
                        onChangeText={(value) => {
                            setOriginQuery(value)
                            setOriginLocation(null)
                        }}
                        selected={originLocation}
                        onPick={(location) => {
                            setOriginLocation(location)
                            setOriginQuery(location.name)
                        }}
                        options={originSearch.data ?? []}
                        iconColor="#3B82F6"
                    />

                    <LocationInput
                        label="Diem den"
                        placeholder="Nhap diem den"
                        value={destinationQuery}
                        onChangeText={(value) => {
                            setDestinationQuery(value)
                            setDestinationLocation(null)
                        }}
                        selected={destinationLocation}
                        onPick={(location) => {
                            setDestinationLocation(location)
                            setDestinationQuery(location.name)
                        }}
                        options={destinationSearch.data ?? []}
                        iconColor="#EF4444"
                    />

                    <Text style={tw`text-xs text-gray-500 mb-1`}>Ngay di</Text>
                    <View style={tw`mb-4 flex-row items-center rounded-xl border border-gray-200 bg-white px-3 py-3`}>
                        <Calendar size={18} color="#10B981" />
                        <TextInput
                            style={tw`ml-2 flex-1 text-base font-medium text-gray-900`}
                            placeholder="YYYY-MM-DD"
                            value={departureDate}
                            onChangeText={(value) => setDepartureDate(normalizeDateInput(value))}
                        />
                    </View>

                    <TouchableOpacity
                        style={tw`${canSearch ? 'bg-blue-600' : 'bg-blue-300'} flex-row items-center justify-center rounded-xl py-4`}
                        onPress={handleSearch}
                        disabled={!canSearch}
                    >
                        <Search size={20} color="white" />
                        <Text style={tw`ml-2 text-base font-bold text-white`}>Tim chuyen xe</Text>
                    </TouchableOpacity>

                    {(originSearch.isLoading || destinationSearch.isLoading) && (
                        <Text style={tw`mt-3 text-center text-xs text-gray-500`}>Dang tim diem di/den...</Text>
                    )}

                    <Text style={tw`mt-3 text-center text-xs text-gray-400`}>
                        Goi y nhap ten tinh/thanh de tim nhanh diem don-tra.
                    </Text>
                </View>

                <View style={tw`mt-6 flex-row`}>
                    <View style={tw`mr-2 flex-1 rounded-2xl border border-green-100 bg-green-50 p-4`}>
                        <Shield size={18} color="#16A34A" />
                        <Text style={tw`mt-2 text-sm font-bold text-green-700`}>Thanh toan an toan</Text>
                        <Text style={tw`mt-1 text-xs text-green-700`}>Bao mat thong tin va giao dich.</Text>
                    </View>
                    <View style={tw`ml-2 flex-1 rounded-2xl border border-blue-100 bg-blue-50 p-4`}>
                        <Users size={18} color="#2563EB" />
                        <Text style={tw`mt-2 text-sm font-bold text-blue-700`}>Ho tro 24/7</Text>
                        <Text style={tw`mt-1 text-xs text-blue-700`}>Nhan tu van nhanh khi can.</Text>
                    </View>
                </View>

                <UpcomingTripsSection />
            </ScrollView>
        </SafeAreaView>
    )
}
