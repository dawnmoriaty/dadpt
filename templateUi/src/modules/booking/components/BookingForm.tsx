import { Loader2, Ticket } from 'lucide-react'
import { useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Form,
    FormControl,
    FormDescription,
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
import { Separator } from '@/components/ui/separator'
import { formResolver } from '@/lib/form/resolver'
import type { Trip } from '@/modules/trip'

import { useCreateBooking } from '../hooks'
import { createBookingSchema, type CreateBookingFormData } from '../schemas'

interface BookingFormProps {
    trip: Trip
    passengers: number
    onSuccess: (bookingCode: string) => void
}

function generateSeatCodes(totalAvailable: number): string[] {
    const seats: string[] = []
    const rows = Math.ceil(totalAvailable / 4)
    const cols = ['A', 'B', 'C', 'D']
    let count = 0
    for (let r = 1; r <= rows && count < totalAvailable; r++) {
        for (const c of cols) {
            if (count >= totalAvailable) break
            seats.push(`${r}${c}`)
            count++
        }
    }
    return seats
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(amount)
}

export function BookingForm({ trip, passengers, onSuccess }: BookingFormProps) {
    const createBooking = useCreateBooking()
    const availableSeats = useMemo(() => generateSeatCodes(trip.availableSeats), [trip.availableSeats])

    const form = useForm<CreateBookingFormData>({
        resolver: formResolver(createBookingSchema),
        defaultValues: {
            tripId: trip.id,
            seatCodes: [],
            guestInfo: { name: '', phone: '', email: '' },
            pickupInfo: { name: '', surcharge: 0 },
            dropoffInfo: { name: '', surcharge: 0 },
            paymentMethod: '',
        },
    })

    const selectedSeats = useWatch({ control: form.control, name: 'seatCodes' })
    const totalAmount = selectedSeats.length * trip.finalPrice

    const onSubmit = (data: CreateBookingFormData) => {
        createBooking.mutate(data, {
            onSuccess: (booking) => {
                onSuccess(booking.code)
            },
        })
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Trip Summary */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Ticket className="h-5 w-5" />
                            Trip Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">Route</p>
                                <p className="font-medium">{trip.originName} → {trip.destinationName}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Provider</p>
                                <p className="font-medium">{trip.providerName}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Departure</p>
                                <p className="font-medium">
                                    {new Date(trip.departureTime).toLocaleString('vi-VN')}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Arrival</p>
                                <p className="font-medium">
                                    {new Date(trip.arrivalTime).toLocaleString('vi-VN')}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Price/seat</p>
                                <p className="font-bold text-primary">{formatCurrency(trip.finalPrice)}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Available seats</p>
                                <p className="font-medium">{trip.availableSeats}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Seat Selection */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Select Seats</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Choose {passengers} seat{passengers > 1 ? 's' : ''} for your trip
                        </p>
                    </CardHeader>
                    <CardContent>
                        <FormField
                            control={form.control}
                            name="seatCodes"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                                        {availableSeats.map((seat) => {
                                            const isSelected = field.value.includes(seat)
                                            return (
                                                <Button
                                                    key={seat}
                                                    type="button"
                                                    variant={isSelected ? 'default' : 'outline'}
                                                    size="sm"
                                                    className="text-xs h-9"
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            field.onChange(field.value.filter((s: string) => s !== seat))
                                                        } else if (field.value.length < passengers) {
                                                            field.onChange([...field.value, seat])
                                                        }
                                                    }}
                                                >
                                                    {seat}
                                                </Button>
                                            )
                                        })}
                                    </div>
                                    <FormDescription>
                                        Selected: {selectedSeats.length}/{passengers}
                                        {selectedSeats.length > 0 && (
                                            <span className="ml-2">
                                                ({selectedSeats.map((s) => (
                                                    <Badge key={s} variant="secondary" className="ml-1 text-xs">
                                                        {s}
                                                    </Badge>
                                                ))})
                                            </span>
                                        )}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {/* Guest Info */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="guestInfo.name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nguyen Van A" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="guestInfo.phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="0901234567" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="guestInfo.email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input type="email" placeholder="email@example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Pickup & Dropoff */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Pickup & Dropoff</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="pickupInfo.name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Pickup Point *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Ben Xe Mien Dong" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="dropoffInfo.name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Dropoff Point *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Ben Xe Da Lat" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {/* Payment Method */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Payment Method</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <FormField
                            control={form.control}
                            name="paymentMethod"
                            render={({ field }) => (
                                <FormItem>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select payment method..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="cod">Cash on Delivery (COD)</SelectItem>
                                            <SelectItem value="vnpay">VNPay</SelectItem>
                                            <SelectItem value="momo">MoMo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <Separator />

                {/* Price Summary & Submit */}
                <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Amount</p>
                                <p className="text-3xl font-bold text-primary">
                                    {formatCurrency(totalAmount)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''} × {formatCurrency(trip.finalPrice)}
                                </p>
                            </div>
                            <Button
                                type="submit"
                                size="lg"
                                disabled={createBooking.isPending || selectedSeats.length !== passengers}
                                className="min-w-40"
                            >
                                {createBooking.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Booking...
                                    </>
                                ) : (
                                    'Confirm Booking'
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </Form>
    )
}
