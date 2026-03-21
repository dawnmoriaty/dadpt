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
        <Card className={cn('w-full shadow-2xl border-0 bg-white rounded-2xl overflow-hidden', compact ? 'max-w-full' : 'max-w-5xl mx-auto')}>
            <CardContent className={cn('p-5 md:p-6', compact && 'px-6 py-5')}>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSearch)}
                        className={cn('flex flex-wrap md:flex-nowrap gap-3 md:gap-2 items-end', compact ? 'md:flex-nowrap' : 'md:grid md:grid-cols-4')}
                    >
                        {/* Origin */}
                        <FormField
                            control={form.control}
                            name="originId"
                            render={({ field }) => (
                                <FormItem className={cn('flex-1 min-w-[180px]', compact && 'md:flex-1')}>
                                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-1 block">
                                        Nơi khởi phát
                                    </FormLabel>
                                    <FormControl>
                                        <LocationCombobox
                                            value={field.value}
                                            onSelect={field.onChange}
                                            placeholder={t('searchPage.selectOrigin')}
                                        />
                                    </FormControl>
                                    <FormMessage className="text-xs mt-1" />
                                </FormItem>
                            )}
                        />

                        {/* Swap button */}
                        <div className={cn('hidden md:flex items-end justify-center', compact && 'md:block')}>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="rounded-lg h-10 w-10 hover:bg-gray-100 transition-colors"
                                onClick={(e) => {
                                    e.preventDefault()
                                    const originId = form.getValues('originId')
                                    const destId = form.getValues('destinationId')
                                    form.setValue('originId', destId)
                                    form.setValue('destinationId', originId)
                                }}
                                title="Đổi chỗ"
                            >
                                <ArrowRightLeft className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Destination */}
                        <FormField
                            control={form.control}
                            name="destinationId"
                            render={({ field }) => (
                                <FormItem className={cn('flex-1 min-w-[180px]', compact && 'md:flex-1')}>
                                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-1 block">
                                        Nơi đến
                                    </FormLabel>
                                    <FormControl>
                                        <LocationCombobox
                                            value={field.value}
                                            onSelect={field.onChange}
                                            placeholder={t('searchPage.selectDest')}
                                        />
                                    </FormControl>
                                    <FormMessage className="text-xs mt-1" />
                                </FormItem>
                            )}
                        />

                        {/* Date */}
                        <FormField
                            control={form.control}
                            name="departureDate"
                            render={({ field }) => (
                                <FormItem className={cn('flex-1 min-w-[160px]', compact && 'md:flex-1')}>
                                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-1 block">
                                        Ngày đi
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
                                    <FormMessage className="text-xs mt-1" />
                                </FormItem>
                            )}
                        />

                        {compact && (
                            <FormField
                                control={form.control}
                                name="passengers"
                                render={({ field }) => (
                                    <FormItem className="flex-1 min-w-[120px] md:flex-none">
                                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-1 block">
                                            Hành khách
                                        </FormLabel>
                                        <FormControl>
                                            <Input type="number" min={1} max={10} {...field} className="h-11" />
                                        </FormControl>
                                        <FormMessage className="text-xs mt-1" />
                                    </FormItem>
                                )}
                            />
                        )}

                        <Button 
                            type="submit" 
                            size="lg" 
                            className={cn('h-11 text-base font-bold shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg border-2 text-gray-900 active:scale-95', compact ? 'w-full md:w-auto md:px-8' : 'w-full')}
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
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
