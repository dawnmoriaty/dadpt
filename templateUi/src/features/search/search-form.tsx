'use client'

import { format } from 'date-fns'
import { ArrowRight, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

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

    return (
        <Card className="w-full max-w-4xl shadow-2xl bg-white/98 backdrop-blur-sm border border-blue-100/50 rounded-2xl overflow-hidden">
            <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Main Grid */}
                    <div className="grid gap-4 md:gap-6 md:grid-cols-4 md:items-end">
                        {/* From Location */}
                        <div className="space-y-2.5">
                            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Từ đâu
                            </Label>
                            <LocationCombobox
                                value={originId}
                                onSelect={setOriginId}
                                placeholder="Chọn nơi khởi hành..."
                            />
                        </div>

                        {/* Swap Button - Desktop Only */}
                        <div className="hidden md:flex justify-center">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={handleSwapLocations}
                                className="rounded-full h-10 w-10 hover:bg-primary/10 hover:text-primary transition-all"
                                title="Đổi chỗ"
                            >
                                <ArrowRight className="h-4 w-4 rotate-90" />
                            </Button>
                        </div>

                        {/* To Location */}
                        <div className="space-y-2.5">
                            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Đến đâu
                            </Label>
                            <LocationCombobox
                                value={destinationId}
                                onSelect={setDestinationId}
                                placeholder="Chọn điểm đến..."
                            />
                        </div>

                        {/* Departure Date */}
                        <div className="space-y-2.5">
                            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Ngày khởi hành
                            </Label>
                            <DatePicker
                                value={date}
                                onChange={setDate}
                                placeholder="Chọn ngày..."
                                minDate={new Date()}
                            />
                        </div>
                    </div>

                    {/* Search Button */}
                    <div className="flex gap-3 md:gap-4">
                        <Button
                            type="submit"
                            size="lg"
                            className={cn(
                                'flex-1 md:flex-none md:w-48 h-12 text-base font-semibold transition-all duration-300',
                                'bg-gradient-to-r from-primary to-primary/80 hover:shadow-xl hover:scale-105',
                                !isFormValid && 'opacity-50 cursor-not-allowed hover:scale-100'
                            )}
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
                    <div className="text-xs text-muted-foreground text-center">
                        Tìm và đặt vé xe một cách nhanh chóng, an toàn
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
