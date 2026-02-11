import { Loader2, Ticket } from 'lucide-react'
import { useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

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
import type { CreateBookingResponse } from '../types'

interface BookingFormProps {
    trip: Trip
    passengers: number
    onSuccess: (data: CreateBookingResponse) => void
}

function generateSeatCodes(totalAvailable: number, bookedSeats: string[]): string[] {
    const seats: string[] = []
    const rows = Math.ceil((totalAvailable + bookedSeats.length) / 4)
    const cols = ['A', 'B', 'C', 'D']
    for (let r = 1; r <= rows; r++) {
        for (const c of cols) {
            const code = `${r}${c}`
            if (!bookedSeats.includes(code)) {
                seats.push(code)
            }
        }
    }
    return seats.slice(0, totalAvailable)
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(amount)
}

export function BookingForm({ trip, passengers, onSuccess }: BookingFormProps) {
    const createBooking = useCreateBooking()
    const { t } = useTranslation()
    const availableSeats = useMemo(
        () => generateSeatCodes(trip.availableSeats, trip.bookedSeats ?? []),
        [trip.availableSeats, trip.bookedSeats],
    )

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
            onSuccess: (response) => {
                onSuccess(response)
            },
        })
    }

    const pickupPoints = trip.pickupPoints ?? []
    const dropoffPoints = trip.dropoffPoints ?? []

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Trip Summary */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Ticket className="h-5 w-5" />
                            {t('booking.tripSummary')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">{t('booking.route')}</p>
                                <p className="font-medium">{trip.originName} → {trip.destinationName}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">{t('booking.provider')}</p>
                                <p className="font-medium">{trip.providerName}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">{t('booking.departure')}</p>
                                <p className="font-medium">
                                    {new Date(trip.departureTime).toLocaleString('vi-VN')}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">{t('booking.arrival')}</p>
                                <p className="font-medium">
                                    {new Date(trip.arrivalTime).toLocaleString('vi-VN')}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">{t('booking.pricePerSeat')}</p>
                                <p className="font-bold text-primary">{formatCurrency(trip.finalPrice)}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">{t('booking.availableSeats')}</p>
                                <p className="font-medium">{trip.availableSeats}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Seat Selection */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{t('booking.selectSeats')}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {t('booking.selectSeatsHint', { count: passengers })}
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
                                                        } else {
                                                            const currentSeats = [...field.value, seat]
                                                            if (currentSeats.length > 4) {
                                                                toast.error(t('booking.errorTooManySeats', { max: 4 }))
                                                                return
                                                            }

                                                            // Validation logic for consecutive seats
                                                            if (currentSeats.length > 1) {
                                                                const row = seat.substring(0, seat.length - 1)
                                                                
                                                                // Check if all selected seats are in the same row
                                                                const allInSameRow = currentSeats.every(s => s.startsWith(row))
                                                                if (!allInSameRow) {
                                                                    toast.error(t('booking.errorNotSameRow'))
                                                                    return
                                                                }

                                                                // Check if they are consecutive
                                                                // Extract columns and sort them
                                                                const cols = currentSeats.map(s => s.substring(s.length - 1)).sort()
                                                                const charCodes = cols.map(c => c.charCodeAt(0))
                                                                
                                                                let isConsecutive = true
                                                                for (let i = 0; i < charCodes.length - 1; i++) {
                                                                    if (charCodes[i+1] - charCodes[i] !== 1) {
                                                                        isConsecutive = false
                                                                        break
                                                                    }
                                                                }

                                                                if (!isConsecutive) {
                                                                    toast.error(t('booking.errorNotConsecutive'))
                                                                    return
                                                                }
                                                            }
                                                            
                                                            field.onChange(currentSeats)
                                                        }
                                                    }}
                                                >
                                                    {seat}
                                                </Button>
                                            )
                                        })}
                                    </div>
                                    <FormDescription>
                                        {t('booking.selected', { current: selectedSeats.length, total: passengers })}
                                                {selectedSeats.length > 0 && (
                                            <span className="ml-2">
                                                ({selectedSeats.map((s: string) => (
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
                        <CardTitle className="text-lg">{t('booking.contactInfo')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="guestInfo.name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('booking.fullName')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('booking.namePlaceholder')} {...field} />
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
                                        <FormLabel>{t('booking.phone')}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t('booking.phonePlaceholder')} {...field} />
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
                                        <FormLabel>{t('booking.email')}</FormLabel>
                                        <FormControl>
                                            <Input type="email" placeholder={t('booking.emailPlaceholder')} {...field} />
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
                        <CardTitle className="text-lg">{t('booking.pickupDropoff')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="pickupInfo.name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('booking.pickupPoint')}</FormLabel>
                                    {pickupPoints.length > 0 ? (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('booking.pickupPlaceholder')} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {pickupPoints.map((p) => (
                                                    <SelectItem key={p.name} value={p.name}>
                                                        {p.name} {p.time ? `(${p.time})` : ''} {p.surcharge > 0 ? `+${formatCurrency(p.surcharge)}` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <FormControl>
                                            <Input placeholder={t('booking.pickupPlaceholder')} {...field} />
                                        </FormControl>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="dropoffInfo.name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('booking.dropoffPoint')}</FormLabel>
                                    {dropoffPoints.length > 0 ? (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('booking.dropoffPlaceholder')} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {dropoffPoints.map((p) => (
                                                    <SelectItem key={p.name} value={p.name}>
                                                        {p.name} {p.time ? `(${p.time})` : ''} {p.surcharge > 0 ? `+${formatCurrency(p.surcharge)}` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <FormControl>
                                            <Input placeholder={t('booking.dropoffPlaceholder')} {...field} />
                                        </FormControl>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {/* Payment Method */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{t('booking.paymentMethod')}</CardTitle>
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
                                                <SelectValue placeholder={t('booking.selectPayment')} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="cod">{t('booking.cod')}</SelectItem>
                                            <SelectItem value="vnpay">{t('booking.vnpay')}</SelectItem>
                                            <SelectItem value="momo">{t('booking.momo')}</SelectItem>
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
                                <p className="text-sm text-muted-foreground">{t('booking.totalAmount')}</p>
                                <p className="text-3xl font-bold text-primary">
                                    {formatCurrency(totalAmount)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {selectedSeats.length} {t('field.seats').toLowerCase()} × {formatCurrency(trip.finalPrice)}
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
                                        {t('booking.booking')}
                                    </>
                                ) : (
                                    t('booking.confirmBooking')
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </Form>
    )
}
