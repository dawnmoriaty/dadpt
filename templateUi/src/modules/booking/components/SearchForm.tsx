import { ArrowRightLeft, CalendarDays, Search, Users } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

import { searchTripsSchema, type SearchTripsFormData } from '../schemas'

interface SearchFormProps {
    onSearch: (data: SearchTripsFormData) => void
    defaultValues?: Partial<SearchTripsFormData>
    compact?: boolean
}

export function SearchForm({ onSearch, defaultValues, compact }: SearchFormProps) {
    const [originSearch, setOriginSearch] = useState('')
    const [destSearch, setDestSearch] = useState('')
    const { t } = useTranslation()

    const { data: originLocations } = useSearchLocations(originSearch)
    const { data: destLocations } = useSearchLocations(destSearch)

    const form = useForm<SearchTripsFormData>({
        resolver: formResolver(searchTripsSchema),
        defaultValues: {
            originId: defaultValues?.originId ?? 0,
            destinationId: defaultValues?.destinationId ?? 0,
            departureDate: defaultValues?.departureDate ?? '',
            passengers: defaultValues?.passengers ?? 1,
        },
    })

    const originItems = originLocations ?? []
    const destItems = destLocations ?? []

    return (
        <Card className={`w-full ${compact ? 'max-w-full' : 'max-w-4xl'} shadow-xl bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/60`}>
            <CardContent className="p-6">
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSearch)}
                        className={`grid gap-4 ${compact ? 'md:grid-cols-5' : 'md:grid-cols-4'} items-end`}
                    >
                        {/* Origin */}
                        <FormField
                            control={form.control}
                            name="originId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm font-medium flex items-center gap-1.5">
                                        <div className="h-3 w-3 rounded-full border-2 border-primary/60" />
                                        {t('searchPage.from')}
                                    </FormLabel>
                                    <Input
                                        placeholder={t('searchPage.searchOrigin')}
                                        value={originSearch}
                                        onChange={(e) => setOriginSearch(e.target.value)}
                                        className="mb-1"
                                    />
                                    {originItems.length > 0 && (
                                        <Select
                                            onValueChange={(val) => field.onChange(Number(val))}
                                            value={field.value ? field.value.toString() : ''}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('searchPage.selectOrigin')} />
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

                        {/* Swap button (visual only on large layout) */}
                        {!compact && (
                            <div className="hidden md:flex items-center justify-center -mx-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full"
                                    onClick={() => {
                                        const originId = form.getValues('originId')
                                        const destId = form.getValues('destinationId')
                                        form.setValue('originId', destId)
                                        form.setValue('destinationId', originId)
                                        const tempSearch = originSearch
                                        setOriginSearch(destSearch)
                                        setDestSearch(tempSearch)
                                    }}
                                >
                                    <ArrowRightLeft className="h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        {/* Destination */}
                        <FormField
                            control={form.control}
                            name="destinationId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm font-medium flex items-center gap-1.5">
                                        <div className="h-3 w-3 rounded-full bg-primary/60" />
                                        {t('searchPage.to')}
                                    </FormLabel>
                                    <Input
                                        placeholder={t('searchPage.searchDest')}
                                        value={destSearch}
                                        onChange={(e) => setDestSearch(e.target.value)}
                                        className="mb-1"
                                    />
                                    {destItems.length > 0 && (
                                        <Select
                                            onValueChange={(val) => field.onChange(Number(val))}
                                            value={field.value ? field.value.toString() : ''}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('searchPage.selectDest')} />
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

                        {/* Date */}
                        <FormField
                            control={form.control}
                            name="departureDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm font-medium flex items-center gap-1.5">
                                        <CalendarDays className="h-3.5 w-3.5" />
                                        {t('searchPage.date')}
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="date"
                                            min={new Date().toISOString().split('T')[0]}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {compact && (
                            <FormField
                                control={form.control}
                                name="passengers"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-medium flex items-center gap-1.5">
                                            <Users className="h-3.5 w-3.5" />
                                            {t('field.passengers')}
                                        </FormLabel>
                                        <FormControl>
                                            <Input type="number" min={1} max={10} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <Button type="submit" size="lg" className="gap-2">
                            <Search className="h-4 w-4" />
                            {t('searchPage.searchBtn')}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
