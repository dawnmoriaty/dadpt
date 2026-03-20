import { Loader2, MapPin, Plus, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useFieldArray, useForm, useWatch, type Control } from 'react-hook-form'

import { DateTimePicker } from '@/components/common/date-time-picker'
import { LocationCombobox } from '@/components/common/location-combobox'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { useLocation } from '@/modules/location'
import { useProviders } from '@/modules/provider/hooks'

import { createTripSchema, type CreateTripFormData } from '../schemas'
import type { Point, Trip, UpdateTripRequest } from '../types'

interface TripFormProps {
    isOpen: boolean
    onClose: () => void
    onCreate: (data: CreateTripFormData) => void
    onUpdate: (id: number, data: UpdateTripRequest) => void
    initialTrip?: Trip | null
    isLoading?: boolean
}

const defaultFormValues: CreateTripFormData = {
    providerId: 0,
    busId: 1,
    originId: 0,
    destinationId: 0,
    departureTime: '',
    arrivalTime: '',
    basePrice: 0,
    availableSeats: 40,
    pickupPoints: [],
    dropoffPoints: [],
}

export function TripForm({
    isOpen,
    onClose,
    onCreate,
    onUpdate,
    initialTrip,
    isLoading,
}: TripFormProps): React.ReactElement {
    const { data: providers } = useProviders({ page: 1, pageSize: 100 })
    const isEditMode = !!initialTrip

    const form = useForm<CreateTripFormData>({
        resolver: formResolver(createTripSchema),
        defaultValues: defaultFormValues,
    })

    const pickupPointsFieldArray = useFieldArray({
        control: form.control,
        name: 'pickupPoints',
    })

    const dropoffPointsFieldArray = useFieldArray({
        control: form.control,
        name: 'dropoffPoints',
    })

    const originId = useWatch({ control: form.control, name: 'originId' })
    const destinationId = useWatch({ control: form.control, name: 'destinationId' })
    const { data: originLocation } = useLocation(originId)
    const { data: destinationLocation } = useLocation(destinationId)
    const autoPickupNameRef = useRef<string | null>(null)
    const autoDropoffNameRef = useRef<string | null>(null)
    const initializedKeyRef = useRef<string | null>(null)

    useEffect(() => {
        if (!isOpen) {
            initializedKeyRef.current = null
            autoPickupNameRef.current = null
            autoDropoffNameRef.current = null
            return
        }

        const nextKey = initialTrip ? `edit-${initialTrip.id}` : 'create'
        if (initializedKeyRef.current === nextKey) {
            return
        }

        initializedKeyRef.current = nextKey

        if (initialTrip) {
            form.reset({
                providerId: initialTrip.providerId,
                busId: initialTrip.busId,
                originId: initialTrip.originId,
                destinationId: initialTrip.destinationId,
                departureTime: initialTrip.departureTime,
                arrivalTime: initialTrip.arrivalTime,
                basePrice: initialTrip.basePrice,
                availableSeats: initialTrip.availableSeats,
                pickupPoints: initialTrip.pickupPoints ?? [],
                dropoffPoints: initialTrip.dropoffPoints ?? [],
            })
            autoPickupNameRef.current = null
            autoDropoffNameRef.current = null
            return
        }

        form.reset(defaultFormValues)
        autoPickupNameRef.current = null
        autoDropoffNameRef.current = null
    }, [form, initialTrip, isOpen])

    useEffect(() => {
        if (!isOpen || !originLocation?.name) {
            return
        }

        if (autoPickupNameRef.current === originLocation.name) {
            return
        }

        pickupPointsFieldArray.replace(
            mergeTerminalPoint({
                points: form.getValues('pickupPoints') ?? [],
                terminalName: originLocation.name,
                autoTerminalName: autoPickupNameRef.current,
                position: 'start',
            }),
        )
        autoPickupNameRef.current = originLocation.name
    }, [form, isOpen, originLocation?.name, pickupPointsFieldArray])

    useEffect(() => {
        if (!isOpen || !destinationLocation?.name) {
            return
        }

        if (autoDropoffNameRef.current === destinationLocation.name) {
            return
        }

        dropoffPointsFieldArray.replace(
            mergeTerminalPoint({
                points: form.getValues('dropoffPoints') ?? [],
                terminalName: destinationLocation.name,
                autoTerminalName: autoDropoffNameRef.current,
                position: 'end',
            }),
        )
        autoDropoffNameRef.current = destinationLocation.name
    }, [destinationLocation?.name, dropoffPointsFieldArray, form, isOpen])

    const handleFormSubmit = (values: CreateTripFormData): void => {
        const pickupPoints = sanitizePoints(values.pickupPoints)
        const dropoffPoints = sanitizePoints(values.dropoffPoints)

        if (initialTrip) {
            onUpdate(initialTrip.id, {
                originId: values.originId,
                destinationId: values.destinationId,
                departureTime: values.departureTime,
                arrivalTime: values.arrivalTime,
                basePrice: values.basePrice,
                availableSeats: values.availableSeats,
                pickupPoints,
                dropoffPoints,
            })
            return
        }

        onCreate({
            ...values,
            pickupPoints,
            dropoffPoints,
        })
    }

    const providerItems = providers?.items ?? []

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden p-0">
                <DialogHeader className="border-b px-6 py-4">
                    <DialogTitle>{isEditMode ? 'Cập nhật chuyến đi' : 'Create New Trip'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode
                            ? 'Cập nhật thông tin chuyến đi, điểm đón và điểm trả.'
                            : 'Tạo chuyến đi mới và cấu hình các điểm đón trả cho khách.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex max-h-[calc(90vh-73px)] flex-col">
                        <div className="flex-1 overflow-y-auto px-6 py-4">
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
                                        disabled={isEditMode}
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
                                            selectedLabel={initialTrip && field.value === initialTrip.originId
                                                ? `${initialTrip.originName} - ${initialTrip.originCity}`
                                                : undefined}
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
                                            selectedLabel={initialTrip && field.value === initialTrip.destinationId
                                                ? `${initialTrip.destinationName} - ${initialTrip.destinationCity}`
                                                : undefined}
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

                        <div className="grid gap-4 lg:grid-cols-2">
                            <PointListSection
                                title="Điểm đón"
                                description="Thêm các điểm khách có thể lên xe cho chuyến này."
                                emptyText="Chưa có điểm đón nào."
                                fields={pickupPointsFieldArray.fields}
                                onAdd={() => pickupPointsFieldArray.append(createEmptyPoint())}
                                onRemove={(index) => pickupPointsFieldArray.remove(index)}
                                registerName={(index) => `pickupPoints.${index}.name`}
                                control={form.control}
                            />

                            <PointListSection
                                title="Điểm trả"
                                description="Thêm các điểm khách có thể xuống xe cho chuyến này."
                                emptyText="Chưa có điểm trả nào."
                                fields={dropoffPointsFieldArray.fields}
                                onAdd={() => dropoffPointsFieldArray.append(createEmptyPoint())}
                                onRemove={(index) => dropoffPointsFieldArray.remove(index)}
                                registerName={(index) => `dropoffPoints.${index}.name`}
                                control={form.control}
                            />
                        </div>

                        </div>

                        <div className="border-t bg-background px-6 py-4">
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditMode ? 'Lưu thay đổi' : 'Create Trip'}
                        </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

function createEmptyPoint() {
    return {
        name: '',
        time: '',
        surcharge: 0,
    }
}

function sanitizePoints(points: CreateTripFormData['pickupPoints']) {
    return (points ?? [])
        .map((point) => ({
            name: point.name.trim(),
            time: point.time ?? '',
            surcharge: point.surcharge ?? 0,
        }))
        .filter((point) => point.name.length > 0)
}

interface MergeTerminalPointParams {
    points: Point[]
    terminalName: string
    autoTerminalName: string | null
    position: 'start' | 'end'
}

function mergeTerminalPoint({ points, terminalName, autoTerminalName, position }: MergeTerminalPointParams): Point[] {
    const cleanedPoints = autoTerminalName
        ? points.filter((point) => point.name !== autoTerminalName)
        : [...points]

    if (cleanedPoints.some((point) => point.name === terminalName)) {
        return cleanedPoints
    }

    const terminalPoint: Point = {
        name: terminalName,
        time: '',
        surcharge: 0,
    }

    return position === 'start'
        ? [terminalPoint, ...cleanedPoints]
        : [...cleanedPoints, terminalPoint]
}

interface PointListSectionProps {
    title: string
    description: string
    emptyText: string
    fields: Array<{ id: string }>
    onAdd: () => void
    onRemove: (index: number) => void
    registerName: (index: number) => `pickupPoints.${number}.name` | `dropoffPoints.${number}.name`
    control: Control<CreateTripFormData>
}

function PointListSection({
    title,
    description,
    emptyText,
    fields,
    onAdd,
    onRemove,
    registerName,
    control,
}: PointListSectionProps) {
    return (
        <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onAdd}>
                    <Plus className="h-4 w-4" />
                    Thêm
                </Button>
            </div>

            {fields.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-background/70 px-4 py-6 text-sm text-muted-foreground">
                    {emptyText}
                </div>
            ) : (
                <div className="space-y-3">
                    {fields.map((field, index) => (
                        <div key={field.id} className="rounded-xl border bg-background p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <MapPin className="h-4 w-4 text-primary" />
                                    {title} {index + 1}
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground"
                                    onClick={() => onRemove(index)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            <FormField
                                control={control}
                                name={registerName(index)}
                                render={({ field: pointField }) => (
                                    <FormItem>
                                        <FormLabel>Tên điểm</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ví dụ: Bến xe Miền Đông" {...pointField} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
