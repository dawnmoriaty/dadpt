import { useNavigate } from '@tanstack/react-router'
import { Loader2, Ticket } from 'lucide-react'
import { useEffect } from 'react'
import { useForm, useWatch, type UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

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
import type { Point, Trip } from '@/modules/trip'
import { useAuthStore } from '@/stores/use-auth-store'

import { useCreateBooking } from '../hooks'
import { useMyBookings } from '../hooks/use-booking-hooks'
import { useBookingSeatRules } from '../hooks/use-booking-seat-rules'
import { createBookingSchema, type CreateBookingFormData } from '../schemas'
import type { CreateBookingResponse } from '../types'
import { formatVndCurrency, upsertPendingBookingHistory } from '../utils'

import { SeatMap } from './SeatMap'

const MAX_BOOKING_SEATS = 4

interface BookingFormProps {
    trip: Trip
    passengers: number
    onSuccess: (data: CreateBookingResponse) => void
}

export function BookingForm({ trip, passengers, onSuccess }: BookingFormProps) {
    const createBooking = useCreateBooking()
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { isAuthenticated, user } = useAuthStore()
    const myBookingsQuery = useMyBookings(1, 50, isAuthenticated)

    const form = useForm<CreateBookingFormData>({
        resolver: formResolver(createBookingSchema),
        defaultValues: {
            tripId: trip.id,
            seatCodes: [],
            guestInfo: {
                name: user?.fullName ?? '',
                phone: user?.phone ?? '',
                email: user?.email ?? '',
            },
            pickupInfo: { name: '', surcharge: 0 },
            dropoffInfo: { name: '', surcharge: 0 },
            paymentMethod: '',
        },
    })

    const selectedSeats = useWatch({ control: form.control, name: 'seatCodes' })
    const selectedPickupName = useWatch({ control: form.control, name: 'pickupInfo.name' })
    const selectedDropoffName = useWatch({ control: form.control, name: 'dropoffInfo.name' })
    const seatRules = useBookingSeatRules(trip.id, myBookingsQuery.data?.items)
    const seatLimit = Math.min(MAX_BOOKING_SEATS, seatRules.maxAdditionalSeats || MAX_BOOKING_SEATS)
    const requestedPassengers = Math.max(passengers, 1)
    const totalAmount = selectedSeats.length * trip.finalPrice

    const draftKey = `booking_draft_${trip.id}`

    useEffect(() => {
        const raw = sessionStorage.getItem(draftKey)
        if (!raw) return
        try {
            const draft = JSON.parse(raw) as Partial<CreateBookingFormData>
            if (draft.tripId && draft.tripId !== trip.id) return
            form.reset({
                ...form.getValues(),
                ...draft,
                tripId: trip.id,
            })
        } catch {
            sessionStorage.removeItem(draftKey)
        }
    }, [draftKey, form, trip.id])

    const onSubmit = (data: CreateBookingFormData) => {
        if (!isAuthenticated) {
            sessionStorage.setItem(draftKey, JSON.stringify(data))
            navigate({ to: '/login', search: { redirect: `/trips/${trip.id}` } })
            return
        }

        createBooking.mutate(data, {
            onSuccess: (response) => {
                sessionStorage.removeItem(draftKey)
                if (response.booking?.status === 'pending') {
                    upsertPendingBookingHistory(response.booking.code, response.orderCode)
                }
                onSuccess(response)
            },
        })
    }

    const pickupPoints = getSelectablePoints(trip.pickupPoints, trip.originName)
    const dropoffPoints = getSelectablePoints(trip.dropoffPoints, trip.destinationName)

    useEffect(() => {
        syncPointSelection({
            form,
            fieldPrefix: 'pickupInfo',
            points: pickupPoints,
            selectedName: selectedPickupName,
        })
    }, [form, pickupPoints, selectedPickupName])

    useEffect(() => {
        syncPointSelection({
            form,
            fieldPrefix: 'dropoffInfo',
            points: dropoffPoints,
            selectedName: selectedDropoffName,
        })
    }, [dropoffPoints, form, selectedDropoffName])

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
                                <p className="font-bold text-primary">{formatVndCurrency(trip.finalPrice)}</p>
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
                            {t('booking.selectSeatsHint', { count: seatLimit })}
                        </p>
                        {isAuthenticated && seatRules.userExistingSeats.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                                {t('booking.selected', {
                                    current: seatRules.userExistingSeats.length,
                                    total: MAX_BOOKING_SEATS,
                                    defaultValue: 'Da co {{current}}/{{total}} ghe tren chuyen nay',
                                })}
                            </p>
                        )}
                        {trip.seatLayout && (
                            <p className="text-xs text-muted-foreground capitalize">
                                {trip.busTypeName}
                            </p>
                        )}
                    </CardHeader>
                    <CardContent>
                        <FormField
                            control={form.control}
                            name="seatCodes"
                            render={({ field }) => (
                                <FormItem>
                                    {trip.seatLayout ? (
                                        <SeatMap
                                            layout={trip.seatLayout}
                                            bookedSeats={trip.bookedSeats ?? []}
                                            selectedSeats={field.value}
                                            maxSeats={seatLimit}
                                            requiredSeats={seatRules.userExistingSeats}
                                            onSelectionChange={field.onChange}
                                        />
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            {t('booking.noSeatLayout', { defaultValue: 'Chuyến này chưa có sơ đồ ghế.' })}
                                        </p>
                                    )}
                                    <FormDescription>
                                        {t('booking.selected', { current: selectedSeats.length, total: seatLimit })}
                                        <span className="ml-2 text-xs text-muted-foreground">
                                            {t('booking.passengerCount', {
                                                count: requestedPassengers,
                                                defaultValue: 'So hanh khach: {{count}}',
                                            })}
                                        </span>
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
                                    <PointSelect
                                        points={pickupPoints}
                                        selectedName={field.value}
                                        placeholder={t('booking.pickupPlaceholder')}
                                        onSelect={(point) => {
                                            applyPointSelection(form, 'pickupInfo', point)
                                        }}
                                    />
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
                                    <PointSelect
                                        points={dropoffPoints}
                                        selectedName={field.value}
                                        placeholder={t('booking.dropoffPlaceholder')}
                                        onSelect={(point) => {
                                            applyPointSelection(form, 'dropoffInfo', point)
                                        }}
                                    />
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
                                            <SelectItem value="bank_transfer">💳 Chuyển khoản ngân hàng</SelectItem>
                                            <SelectItem value="cod">💵 Thanh toán khi lên xe (COD)</SelectItem>
                                            <SelectItem value="visa" disabled>💎 Visa / Mastercard (Sắp ra mắt)</SelectItem>
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
                                    {formatVndCurrency(totalAmount)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {selectedSeats.length} {t('field.seats').toLowerCase()} × {formatVndCurrency(trip.finalPrice)}
                                </p>
                            </div>
                            <Button
                                type="submit"
                                size="lg"
                                disabled={createBooking.isPending || selectedSeats.length === 0}
                                className="min-w-40 h-12 font-bold rounded-lg border-2 text-gray-900 active:scale-95 transition-all duration-300"
                                style={{
                                    backgroundColor: '#FFF541',
                                    borderColor: '#FFE81C',
                                    color: '#1F2937'
                                }}
                                onMouseEnter={(e) => {
                                    if (!createBooking.isPending && selectedSeats.length > 0) {
                                        e.currentTarget.style.backgroundColor = '#FFED4F'
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#FFF541'
                                }}
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

type PointFieldPrefix = 'pickupInfo' | 'dropoffInfo'

interface SyncPointSelectionParams {
    form: UseFormReturn<CreateBookingFormData>
    fieldPrefix: PointFieldPrefix
    points: Point[]
    selectedName?: string
}

function syncPointSelection({ form, fieldPrefix, points, selectedName }: SyncPointSelectionParams) {
    if (points.length === 0) {
        return
    }

    const matchedPoint = points.find((point) => point.name === selectedName)
    const nextPoint = matchedPoint ?? points[0]
    const currentTime = form.getValues(`${fieldPrefix}.time`)
    const currentSurcharge = form.getValues(`${fieldPrefix}.surcharge`)

    if (
        selectedName === nextPoint.name
        && currentTime === (nextPoint.time ?? '')
        && currentSurcharge === (nextPoint.surcharge ?? 0)
    ) {
        return
    }

    applyPointSelection(form, fieldPrefix, nextPoint, false)
}

function applyPointSelection(
    form: UseFormReturn<CreateBookingFormData>,
    fieldPrefix: PointFieldPrefix,
    point: Point,
    shouldDirty = true,
) {
    form.setValue(`${fieldPrefix}.name`, point.name, { shouldDirty, shouldValidate: true })
    form.setValue(`${fieldPrefix}.time`, point.time ?? '', { shouldDirty, shouldValidate: true })
    form.setValue(`${fieldPrefix}.surcharge`, point.surcharge ?? 0, { shouldDirty, shouldValidate: true })
}

interface PointOptionsProps {
    points: Point[]
    selectedName?: string
    placeholder: string
    onSelect: (point: Point) => void
}

function PointSelect({ points, selectedName, placeholder, onSelect }: PointOptionsProps) {
    return (
        <Select
            value={selectedName}
            onValueChange={(value) => {
                const point = points.find((item) => item.name === value)
                if (point) {
                    onSelect(point)
                }
            }}
        >
            <FormControl>
                <SelectTrigger>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
            </FormControl>
            <SelectContent>
                {points.map((point, index) => (
                    <SelectItem key={`${point.name}-${point.time}-${index}`} value={point.name}>
                        {point.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

function getSelectablePoints(points: Point[] | undefined, fallbackName: string): Point[] {
    if (points && points.length > 0) {
        return points.map((point) => ({
            ...point,
            name: point.name.trim() || fallbackName,
        }))
    }

    return [{
        name: fallbackName,
        time: '',
        surcharge: 0,
    }]
}
