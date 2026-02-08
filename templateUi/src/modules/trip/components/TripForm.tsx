import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { formResolver } from '@/lib/form/resolver'
import { useSearchLocations } from '@/modules/location'
import { useProviders } from '@/modules/provider/hooks'

import { createTripSchema, type CreateTripFormData } from '../schemas'

interface TripFormProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: CreateTripFormData) => void
    isLoading?: boolean
}

export function TripForm({ isOpen, onClose, onSubmit, isLoading }: TripFormProps): React.ReactElement {
    const [originSearch, setOriginSearch] = useState('')
    const [destSearch, setDestSearch] = useState('')

    const { data: providers } = useProviders({ page: 1, pageSize: 100 })
    const { data: originLocations } = useSearchLocations(originSearch)
    const { data: destLocations } = useSearchLocations(destSearch)

    const form = useForm<CreateTripFormData>({
        resolver: formResolver(createTripSchema),
        defaultValues: {
            providerId: 0,
            busId: 1, // TODO: add bus selection
            originId: 0,
            destinationId: 0,
            departureTime: '',
            arrivalTime: '',
            basePrice: 0,
            availableSeats: 40,
        },
    })

    const handleFormSubmit = (values: CreateTripFormData): void => {
        onSubmit(values)
    }

    const providerItems = providers?.items ?? []
    const originItems = originLocations ?? []
    const destItems = destLocations ?? []

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Create New Trip</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                        {/* Provider */}
                        <FormField
                            control={form.control}
                            name="providerId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Provider</FormLabel>
                                    <Select
                                        onValueChange={(val) => field.onChange(Number(val))}
                                        value={field.value ? field.value.toString() : ''}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select provider..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {providerItems.map((p) => (
                                                <SelectItem key={p.id} value={p.id.toString()}>
                                                    {p.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Origin */}
                        <div className="space-y-2">
                            <FormField
                                control={form.control}
                                name="originId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Origin</FormLabel>
                                        <Input
                                            placeholder="Search origin location..."
                                            value={originSearch}
                                            onChange={(e) => setOriginSearch(e.target.value)}
                                        />
                                        {originItems.length > 0 && (
                                            <Select
                                                onValueChange={(val) => field.onChange(Number(val))}
                                                value={field.value ? field.value.toString() : ''}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select origin..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {originItems.map((loc) => (
                                                        <SelectItem key={loc.id} value={loc.id.toString()}>
                                                            {loc.name} - {loc.city}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Destination */}
                        <div className="space-y-2">
                            <FormField
                                control={form.control}
                                name="destinationId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Destination</FormLabel>
                                        <Input
                                            placeholder="Search destination location..."
                                            value={destSearch}
                                            onChange={(e) => setDestSearch(e.target.value)}
                                        />
                                        {destItems.length > 0 && (
                                            <Select
                                                onValueChange={(val) => field.onChange(Number(val))}
                                                value={field.value ? field.value.toString() : ''}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select destination..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {destItems.map((loc) => (
                                                        <SelectItem key={loc.id} value={loc.id.toString()}>
                                                            {loc.name} - {loc.city}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Times */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="departureTime"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Departure Time</FormLabel>
                                        <FormControl>
                                            <Input type="datetime-local" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="arrivalTime"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Arrival Time</FormLabel>
                                        <FormControl>
                                            <Input type="datetime-local" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Price & Seats */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="basePrice"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Base Price (VND)</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={0} step={1000} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="availableSeats"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Available Seats</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={1} max={100} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Trip
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
