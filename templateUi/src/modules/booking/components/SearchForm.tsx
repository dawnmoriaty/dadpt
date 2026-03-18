import { ArrowRightLeft, Search, Users } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { DatePicker } from '@/components/common/date-picker'
import { LocationCombobox } from '@/components/common/location-combobox'
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
import { cn } from '@/lib/utils'
import { formResolver } from '@/lib/form/resolver'

import { searchTripsSchema, type SearchTripsFormData } from '../schemas'

interface SearchFormProps {
    onSearch: (data: SearchTripsFormData) => void
    defaultValues?: Partial<SearchTripsFormData>
    compact?: boolean
}

export function SearchForm({ onSearch, defaultValues, compact }: SearchFormProps) {
    const { t } = useTranslation()

    const form = useForm<SearchTripsFormData>({
        resolver: formResolver(searchTripsSchema),
        defaultValues: {
            originId: defaultValues?.originId ?? 0,
            destinationId: defaultValues?.destinationId ?? 0,
            departureDate: defaultValues?.departureDate ?? '',
            passengers: defaultValues?.passengers ?? 1,
        },
    })

    return (
        <Card className={cn('w-full shadow-xl bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/60', compact ? 'max-w-full' : 'max-w-4xl')}>
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
                                    <FormControl>
                                        <LocationCombobox
                                            value={field.value}
                                            onSelect={field.onChange}
                                            placeholder={t('searchPage.selectOrigin')}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Swap button (visual only on large layout) */}
                        {!compact && (
                            <div className="hidden md:flex items-end justify-center pb-2">
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
                                    <FormControl>
                                        <LocationCombobox
                                            value={field.value}
                                            onSelect={field.onChange}
                                            placeholder={t('searchPage.selectDest')}
                                        />
                                    </FormControl>
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
                                        {t('searchPage.date')}
                                    </FormLabel>
                                    <FormControl>
                                        <DatePicker
                                            value={field.value ? new Date(field.value) : undefined}
                                            onChange={(date) =>
                                                field.onChange(date ? date.toISOString().split('T')[0] : '')
                                            }
                                            placeholder={t('searchPage.date')}
                                            minDate={new Date()}
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
