'use client'

import { useNavigate } from '@tanstack/react-router'
import { format } from 'date-fns'
import { ArrowRight, Search } from 'lucide-react'
import { useState } from 'react'

import { DatePicker } from '@/components/common/date-picker'
import { LocationCombobox } from '@/components/common/location-combobox'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface SearchParams {
    originId: number
    destinationId: number
    date: string
}

export function SearchForm(): React.ReactElement {
    const [originId, setOriginId] = useState<number>(0)
    const [destinationId, setDestinationId] = useState<number>(0)
    const [date, setDate] = useState<Date | undefined>(undefined)
    const [isLoading, setIsLoading] = useState(false)
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault()
        if (!originId || !destinationId || !date) return

        setIsLoading(true)
        const params: SearchParams = {
            originId,
            destinationId,
            date: format(date, 'yyyy-MM-dd'),
        }
        navigate({
            to: '/search',
            search: params,
        })
    }

    const handleSwapLocations = () => {
        const temp = originId
        setOriginId(destinationId)
        setDestinationId(temp)
    }

    const isFormValid = originId && destinationId && date
    const [errors, setErrors] = useState<Record<string, string>>({})

    const validateForm = () => {
        const newErrors: Record<string, string> = {}
        if (!originId) newErrors.origin = 'Vui lòng chọn nơi khởi hành'
        if (!destinationId) newErrors.destination = 'Vui lòng chọn điểm đến'
        if (!date) newErrors.date = 'Vui lòng chọn ngày khởi hành'
        if (originId && destinationId && originId === destinationId) {
            newErrors.swap = 'Điểm đi và điểm đến không được giống nhau'
        }
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmitWithValidation = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault()
        if (!validateForm()) return
        await handleSubmit(e)
    }

    return (
        <Card className="w-full max-w-4xl shadow-2xl bg-white/95 backdrop-blur-xl border-0 rounded-3xl overflow-hidden">
            <CardContent className="p-7 md:p-9">
                <form onSubmit={handleSubmitWithValidation} className="space-y-5">
                    {/* Main Grid */}
                    <div className="grid gap-3 md:gap-4 md:grid-cols-4 md:items-end">
                        {/* From Location */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                Từ đâu
                            </Label>
                            <LocationCombobox
                                value={originId}
                                onSelect={(id) => {
                                    setOriginId(id)
                                    setErrors(prev => ({ ...prev, origin: '' }))
                                }}
                                placeholder="Chọn nơi khởi hành..."
                            />
                            {errors.origin && <p className="text-xs text-red-600 font-medium mt-1">✕ {errors.origin}</p>}
                        </div>

                        {/* Swap Button - Desktop Only */}
                        <div className="hidden md:flex justify-center">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={handleSwapLocations}
                                className="rounded-full h-11 w-11 hover:bg-gray-200 hover:text-gray-700 transition-all"
                                title="Đổi chỗ"
                            >
                                <ArrowRight className="h-5 w-5 rotate-90" />
                            </Button>
                        </div>

                        {/* To Location */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                Đến đâu
                            </Label>
                            <LocationCombobox
                                value={destinationId}
                                onSelect={(id) => {
                                    setDestinationId(id)
                                    setErrors(prev => ({ ...prev, destination: '' }))
                                }}
                                placeholder="Chọn điểm đến..."
                            />
                            {errors.destination && <p className="text-xs text-red-600 font-medium mt-1">✕ {errors.destination}</p>}
                        </div>

                        {/* Departure Date */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                Ngày khởi hành
                            </Label>
                            <DatePicker
                                value={date}
                                onChange={(d) => {
                                    setDate(d)
                                    setErrors(prev => ({ ...prev, date: '' }))
                                }}
                                placeholder="Chọn ngày..."
                                minDate={new Date()}
                            />
                            {errors.date && <p className="text-xs text-red-600 font-medium mt-1">✕ {errors.date}</p>}
                        </div>
                    </div>

                    {/* Swap error message */}
                    {errors.swap && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 font-medium">
                            ⚠️ {errors.swap}
                        </div>
                    )}

                    {/* Search Button */}
                    <div className="flex gap-2 md:gap-3 pt-2">
                        <Button
                            type="submit"
                            size="lg"
                            className={cn(
                                'flex-1 md:flex-none md:w-48 h-12 text-base font-bold transition-all duration-300 rounded-lg shadow-md hover:shadow-lg',
                                'text-gray-900 hover:scale-105 active:scale-95',
                                'border-2',
                                !isFormValid && 'opacity-50 cursor-not-allowed hover:scale-100'
                            )}
                            style={{
                                backgroundColor: '#FFF541',
                                borderColor: '#FFE81C'
                            }}
                            onMouseEnter={(e) => {
                                if (!isLoading && isFormValid) {
                                    e.currentTarget.style.backgroundColor = '#FFED4F'
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#FFF541'
                            }}
                            disabled={!isFormValid || isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <span className="inline-block animate-spin mr-2">⏳</span>
                                    Đang tìm...
                                </>
                            ) : (
                                <>
                                    <Search className="mr-2 h-5 w-5" />
                                    Tìm kiếm vé
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Helper Text */}
                    <div className="text-xs text-gray-600 text-center">
                        Tìm và đặt vé xe một cách nhanh chóng, an toàn
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
