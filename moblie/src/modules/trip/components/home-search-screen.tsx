import { useMemo, useState } from 'react'
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Calendar, MapPin, Search, Shield, Users } from 'lucide-react-native'

import { userTheme } from '@/src/constants/user-theme'
import { ResponsiveFrame } from '@/src/components/common/responsive-frame'
import { useWebBreakpoint } from '@/src/hooks/use-web-breakpoint'
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
                    Đã chọn: {selected.name} ({selected.city})
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

interface HomeSearchContentProps {
    routeBasePath?: '/search'
}

export function HomeSearchContent({ routeBasePath = '/search' }: HomeSearchContentProps) {
    const router = useRouter()
    const { isMdUp } = useWebBreakpoint()

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
            pathname: routeBasePath as never,
            params: {
                originId: originLocation.id.toString(),
                destinationId: destinationLocation.id.toString(),
                originName: originLocation.name,
                destinationName: destinationLocation.name,
                date: departureDate,
                passengers: '1',
            },
        } as never)
    }

    return (
        <>
            <View
                style={[
                    tw`mt-4 mb-6 rounded-3xl p-6 shadow-sm`,
                    { backgroundColor: userTheme.colors.primary, borderColor: userTheme.colors.primaryStrong, borderWidth: 1 },
                ]}
            >
                <View style={[tw`mb-2 self-start rounded-full px-3 py-1`, { backgroundColor: 'rgba(255,255,255,0.28)' }]}>
                    <Text style={[tw`text-xs font-semibold`, { color: userTheme.colors.surface }]}>Bus Ticketing</Text>
                </View>
                <Text style={[tw`mb-1 text-2xl font-bold`, { color: userTheme.colors.text }]}>Đặt vé xe khách</Text>
                <Text style={[tw`text-sm`, { color: '#0F5250' }]}>Tìm chuyến nhanh, đặt chỗ dễ dàng và an toàn</Text>
            </View>

            <View style={[tw`rounded-3xl p-4 shadow-sm`, { backgroundColor: userTheme.colors.surface, borderColor: userTheme.colors.border, borderWidth: 1 }]}> 
                <LocationInput
                    label="Điểm đi"
                    placeholder="Nhập điểm đi"
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
                    label="Điểm đến"
                    placeholder="Nhập điểm đến"
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

                <Text style={[tw`text-xs mb-1`, { color: userTheme.colors.mutedText }]}>Ngày đi</Text>
                <View style={[tw`mb-4 flex-row items-center rounded-xl bg-white px-3 py-3`, { borderColor: userTheme.colors.border, borderWidth: 1 }]}> 
                    <Calendar size={18} color={userTheme.colors.success} />
                    <TextInput
                        style={[tw`ml-2 flex-1 text-base font-medium`, { color: userTheme.colors.text }]}
                        placeholder="YYYY-MM-DD"
                        value={departureDate}
                        onChangeText={(value) => setDepartureDate(normalizeDateInput(value))}
                    />
                </View>

                <TouchableOpacity
                    style={[
                        tw`flex-row items-center justify-center rounded-xl py-4`,
                        { backgroundColor: canSearch ? userTheme.colors.primaryStrong : '#7CDDD9' },
                    ]}
                    onPress={handleSearch}
                    disabled={!canSearch}
                >
                    <Search size={20} color={userTheme.colors.surface} />
                    <Text style={[tw`ml-2 text-base font-bold`, { color: userTheme.colors.surface }]}>Tìm chuyến xe</Text>
                </TouchableOpacity>

                {(originSearch.isLoading || destinationSearch.isLoading) && (
                    <Text style={tw`mt-3 text-center text-xs text-gray-500`}>Đang tìm điểm đi/đến...</Text>
                )}

                <Text style={[tw`mt-3 text-center text-xs`, { color: userTheme.colors.mutedText }]}> 
                    Gợi ý nhập tên tỉnh/thành để tìm nhanh điểm đón-trả.
                </Text>
            </View>

            <View style={[tw`mt-6`, isMdUp ? tw`flex-row` : tw`flex-col`]}>
                <View style={[isMdUp ? tw`mr-2 flex-1` : tw`mb-3`, tw`rounded-2xl p-4`, { borderColor: '#BEECD8', borderWidth: 1, backgroundColor: '#ECFDF5' }]}> 
                    <Shield size={18} color={userTheme.colors.success} />
                    <Text style={[tw`mt-2 text-sm font-bold`, { color: '#166534' }]}>Thanh toán an toàn</Text>
                    <Text style={[tw`mt-1 text-xs`, { color: '#166534' }]}>Bảo mật thông tin và giao dịch.</Text>
                </View>
                <View style={[isMdUp ? tw`ml-2 flex-1` : tw``, tw`rounded-2xl p-4`, { borderColor: '#FFE698', borderWidth: 1, backgroundColor: userTheme.colors.secondarySoft }]}> 
                    <Users size={18} color={'#A16207'} />
                    <Text style={[tw`mt-2 text-sm font-bold`, { color: '#A16207' }]}>Hỗ trợ 24/7</Text>
                    <Text style={[tw`mt-1 text-xs`, { color: '#A16207' }]}>Nhận tư vấn nhanh khi cần.</Text>
                </View>
            </View>
        </>
    )
}

export function HomeSearchScreen() {
    return (
        <SafeAreaView style={[tw`flex-1`, { backgroundColor: userTheme.colors.background }]}> 
            <ScrollView contentContainerStyle={tw`pb-10`}>
                <ResponsiveFrame>
                    <HomeSearchContent routeBasePath="/search" />
                    <UpcomingTripsSection />
                </ResponsiveFrame>
            </ScrollView>
        </SafeAreaView>
    )
}

export function HomeSearchCompactScreen() {
    return (
        <SafeAreaView style={[tw`flex-1`, { backgroundColor: userTheme.colors.background }]}> 
            <ScrollView contentContainerStyle={tw`pb-10`}>
                <ResponsiveFrame>
                    <HomeSearchContent routeBasePath="/search" />
                    <UpcomingTripsSection />
                </ResponsiveFrame>
            </ScrollView>
        </SafeAreaView>
    )
}
