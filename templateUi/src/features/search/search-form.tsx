import { format } from 'date-fns'
import { Search } from 'lucide-react'
import { useState } from 'react'

import { DatePicker } from '@/components/common/date-picker'
import { LocationCombobox } from '@/components/common/location-combobox'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

interface SearchParams {
    originId: number
    destinationId: number
    date: string
}

export function SearchForm(): React.ReactElement {
    const [originId, setOriginId] = useState<number>(0)
    const [destinationId, setDestinationId] = useState<number>(0)
    const [date, setDate] = useState<Date | undefined>(undefined)

    const handleSubmit = (e: React.FormEvent): void => {
        e.preventDefault()
        if (!originId || !destinationId || !date) return

        const params: SearchParams = {
            originId,
            destinationId,
            date: format(date, 'yyyy-MM-dd'),
        }
        console.log('Search params:', params)
        // TODO: Navigate to search results page with params
    }

    return (
        <Card className="w-full max-w-4xl shadow-xl bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/60">
            <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-4 items-end">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">From</Label>
                        <LocationCombobox
                            value={originId}
                            onSelect={setOriginId}
                            placeholder="Select origin..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium">To</Label>
                        <LocationCombobox
                            value={destinationId}
                            onSelect={setDestinationId}
                            placeholder="Select destination..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Departure Date</Label>
                        <DatePicker
                            value={date}
                            onChange={setDate}
                            placeholder="Select date..."
                            minDate={new Date()}
                        />
                    </div>

                    <Button
                        type="submit"
                        size="lg"
                        className="w-full text-lg font-semibold"
                        disabled={!originId || !destinationId || !date}
                    >
                        <Search className="mr-2 h-5 w-5" />
                        Search Tickets
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
