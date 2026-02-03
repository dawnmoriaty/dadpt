import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSearchLocations } from '@/modules/location'
import { useProviders } from '@/modules/provider/hooks'

import type { CreateTripRequest } from '../types'

interface TripFormProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: CreateTripRequest) => void
    isLoading?: boolean
}

interface LocationItem {
    id: number
    name: string
    city: string
}

interface ProviderItem {
    id: number
    name: string
}

export function TripForm({ isOpen, onClose, onSubmit, isLoading }: TripFormProps): React.ReactElement {
    const [originSearch, setOriginSearch] = useState('')
    const [destSearch, setDestSearch] = useState('')
    
    const { data: providers } = useProviders({ page: 1, pageSize: 100 })
    const { data: originLocations } = useSearchLocations(originSearch)
    const { data: destLocations } = useSearchLocations(destSearch)

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        onSubmit({
            providerId: Number(formData.get('providerId')),
            busId: 1, // TODO: Add bus selection when bus module is available
            originId: Number(formData.get('originId')),
            destinationId: Number(formData.get('destinationId')),
            departureTime: formData.get('departureTime') as string,
            arrivalTime: formData.get('arrivalTime') as string,
            basePrice: Number(formData.get('basePrice')),
            availableSeats: Number(formData.get('availableSeats')),
        })
    }

    const providerItems = (providers?.items ?? []) as ProviderItem[]
    const originItems = (originLocations ?? []) as LocationItem[]
    const destItems = (destLocations ?? []) as LocationItem[]

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Create New Trip</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Provider */}
                    <div>
                        <Label htmlFor="providerId">Provider</Label>
                        <select
                            id="providerId"
                            name="providerId"
                            required
                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        >
                            <option value="">Select provider...</option>
                            {providerItems.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Origin */}
                    <div>
                        <Label htmlFor="originSearch">Origin</Label>
                        <Input
                            id="originSearch"
                            placeholder="Search origin location..."
                            value={originSearch}
                            onChange={(e) => setOriginSearch(e.target.value)}
                        />
                        {originItems.length > 0 && (
                            <select
                                name="originId"
                                required
                                className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background text-sm"
                            >
                                <option value="">Select origin...</option>
                                {originItems.map((loc) => (
                                    <option key={loc.id} value={loc.id}>{loc.name} - {loc.city}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Destination */}
                    <div>
                        <Label htmlFor="destSearch">Destination</Label>
                        <Input
                            id="destSearch"
                            placeholder="Search destination location..."
                            value={destSearch}
                            onChange={(e) => setDestSearch(e.target.value)}
                        />
                        {destItems.length > 0 && (
                            <select
                                name="destinationId"
                                required
                                className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background text-sm"
                            >
                                <option value="">Select destination...</option>
                                {destItems.map((loc) => (
                                    <option key={loc.id} value={loc.id}>{loc.name} - {loc.city}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Times */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="departureTime">Departure Time</Label>
                            <Input
                                id="departureTime"
                                name="departureTime"
                                type="datetime-local"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="arrivalTime">Arrival Time</Label>
                            <Input
                                id="arrivalTime"
                                name="arrivalTime"
                                type="datetime-local"
                                required
                            />
                        </div>
                    </div>

                    {/* Price & Seats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="basePrice">Base Price (VND)</Label>
                            <Input
                                id="basePrice"
                                name="basePrice"
                                type="number"
                                min={0}
                                step={1000}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="availableSeats">Available Seats</Label>
                            <Input
                                id="availableSeats"
                                name="availableSeats"
                                type="number"
                                min={1}
                                max={100}
                                required
                            />
                        </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        Create Trip
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
