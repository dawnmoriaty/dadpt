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
import { formResolver } from '@/lib/form/resolver'
import { cn } from '@/lib/utils'

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
        <Card className={cn('w-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 rounded-2xl overflow-hidden', compact ? 'max-w-full' : 'max-w-5xl mx-auto')}>
            <CardContent className="p-4 md:p-6">
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
                                    variant="outline"
                                    size="icon"
                                    className="rounded-full shadow-sm hover:shadow-md transition-all duration-300 hover:rotate-180 bg-background z-10"
                                    onClick={(e) => {
                                        e.preventDefault()
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

                        <div className="flex items-end justify-center w-full">
                            <Button 
                                type="submit" 
                                size="lg" 
                                className="w-full h-11 text-base font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 rounded-lg border-2 text-gray-900 active:scale-95"
                                style={{
                                    backgroundColor: '#FFF541',
                                    borderColor: '#FFE81C',
                                    color: '#1F2937'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#FFED4F'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#FFF541'
                                }}
                            >
                                <Search className="h-5 w-5 mr-2" />
                                {t('searchPage.searchBtn')}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
