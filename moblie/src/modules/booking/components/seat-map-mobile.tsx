import { Alert, Text, TouchableOpacity, View } from 'react-native'

import { tw } from '@/src/lib/utils'
import type { SeatLayout } from '@/src/modules/trip'

interface SeatMapMobileProps {
    layout: SeatLayout
    bookedSeats: string[]
    selectedSeats: string[]
    maxSeats: number
    onSelectionChange: (seats: string[]) => void
}

function normalizeSeatCode(code: string): string {
    const value = code.trim().toUpperCase()
    const match = value.match(/^([A-Z]+)(\d+)$/)
    if (!match) return value
    return `${match[1]}${match[2].padStart(2, '0')}`
}

function parseSeatCode(code: string): { prefix: string; number: number } | null {
    const normalized = normalizeSeatCode(code)
    const match = normalized.match(/^([A-Z]+)(\d+)$/)
    if (!match) return null
    return { prefix: match[1], number: parseInt(match[2], 10) }
}

function getSeatLinearIndex(layout: SeatLayout, seatCode: string): number | null {
    const parsed = parseSeatCode(seatCode)
    if (!parsed) return null

    const orderedColumns = layout.columns.filter((column) => column !== '')
    const columnIndex = orderedColumns.indexOf(parsed.prefix)
    if (columnIndex < 0) return null

    return (parsed.number - 1) * orderedColumns.length + columnIndex
}

function isConsecutiveSeatSet(layout: SeatLayout, seatCodes: string[]): boolean {
    if (seatCodes.length <= 1) return true

    const indices = seatCodes
        .map((seatCode) => getSeatLinearIndex(layout, seatCode))
        .filter((index): index is number => index !== null)
        .sort((a, b) => a - b)

    if (indices.length !== seatCodes.length) return false

    for (let i = 1; i < indices.length; i += 1) {
        if (indices[i] - indices[i - 1] !== 1) {
            return false
        }
    }

    return true
}

export function SeatMapMobile({ layout, bookedSeats, selectedSeats, maxSeats, onSelectionChange }: SeatMapMobileProps) {
    const normalizedBooked = bookedSeats.map(normalizeSeatCode)
    const normalizedSelected = selectedSeats.map(normalizeSeatCode)

    const handleSeatPress = (seatCode: string) => {
        const normalized = normalizeSeatCode(seatCode)
        const isSelected = normalizedSelected.includes(normalized)
        if (isSelected) {
            onSelectionChange(selectedSeats.filter((seat) => normalizeSeatCode(seat) !== normalized))
            return
        }

        if (selectedSeats.length >= maxSeats) {
            Alert.alert('Qua so luong ghe', `Ban chi duoc chon toi da ${maxSeats} ghe`)
            return
        }

        const nextSelection = [...selectedSeats, normalized]
        if (!isConsecutiveSeatSet(layout, nextSelection)) {
            Alert.alert('Ghe khong lien ke', 'Vui long chon cac ghe lien ke nhau')
            return
        }

        onSelectionChange(nextSelection)
    }

    return (
        <View>
            <View style={tw`mb-3 flex-row flex-wrap`}>
                <View style={tw`mr-4 flex-row items-center`}>
                    <View style={tw`h-3 w-3 rounded border border-gray-300 bg-white`} />
                    <Text style={tw`ml-1 text-xs text-gray-600`}>Con trong</Text>
                </View>
                <View style={tw`mr-4 flex-row items-center`}>
                    <View style={tw`h-3 w-3 rounded bg-blue-600`} />
                    <Text style={tw`ml-1 text-xs text-gray-600`}>Dang chon</Text>
                </View>
                <View style={tw`mr-4 flex-row items-center`}>
                    <View style={tw`h-3 w-3 rounded bg-gray-300`} />
                    <Text style={tw`ml-1 text-xs text-gray-600`}>Da dat</Text>
                </View>
            </View>

            <View style={tw`flex-row flex-wrap`}>
                {layout.seats.map((seatCode) => {
                    const normalized = normalizeSeatCode(seatCode)
                    const isBooked = normalizedBooked.includes(normalized)
                    const isSelected = normalizedSelected.includes(normalized)

                    return (
                        <TouchableOpacity
                            key={seatCode}
                            style={tw`${isBooked ? 'bg-gray-300 border-gray-300' : isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'} mb-2 mr-2 h-10 min-w-[44px] items-center justify-center rounded-md border px-2`}
                            onPress={() => handleSeatPress(seatCode)}
                            disabled={isBooked}
                        >
                            <Text style={tw`${isBooked || isSelected ? 'text-white' : 'text-gray-700'} text-xs font-medium`}>
                                {seatCode}
                            </Text>
                        </TouchableOpacity>
                    )
                })}
            </View>
        </View>
    )
}
