import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { DateTimePicker } from '@/components/common/date-time-picker'
import { LocationCombobox } from '@/components/common/location-combobox'
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
import { useProviders } from '@/modules/provider/hooks'

import { createTripSchema, type CreateTripFormData } from '../schemas'

interface TripFormProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: CreateTripFormData) => void
    isLoading?: boolean
}

export function TripForm({ isOpen, onClose, onSubmit, isLoading }: TripFormProps): React.ReactElement {
    const { data: providers } = useProviders({ page: 1, pageSize: 100 })

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
                        <FormField
                            control={form.control}
                            name="originId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Origin</FormLabel>
                                    <FormControl>
                                        <LocationCombobox
                                            value={field.value}
                                            onSelect={field.onChange}
                                            placeholder="Select origin location..."
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Destination */}
                        <FormField
                            control={form.control}
                            name="destinationId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Destination</FormLabel>
                                    <FormControl>
                                        <LocationCombobox
                                            value={field.value}
                                            onSelect={field.onChange}
                                            placeholder="Select destination location..."
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Times */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="departureTime"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Departure Time</FormLabel>
                                        <FormControl>
                                            <DateTimePicker
                                                value={field.value ? new Date(field.value) : undefined}
                                                onChange={(date) =>
                                                    field.onChange(date ? date.toISOString() : '')
                                                }
                                                placeholder="Select departure..."
                                            />
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
                                            <DateTimePicker
                                                value={field.value ? new Date(field.value) : undefined}
                                                onChange={(date) =>
                                                    field.onChange(date ? date.toISOString() : '')
                                                }
                                                placeholder="Select arrival..."
                                            />
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
