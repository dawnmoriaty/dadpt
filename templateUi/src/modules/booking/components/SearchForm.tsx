import { CalendarPlus2, Search } from 'lucide-react'
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

    const submitLabel = t('searchPage.searchBtn')

    if (compact) {
        return (
            <Card className="w-full max-w-full border border-border/60 bg-white/95 shadow-2xl rounded-2xl overflow-visible relative z-[90]">
                <CardContent className="p-3 md:p-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSearch)} className="space-y-2">
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-[1.2fr_1.2fr_1fr_auto_auto] md:items-start">
                                <FormField
                                    control={form.control}
                                    name="originId"
                                    render={({ field }) => (
                                        <FormItem className="relative space-y-1">
                                            <FormLabel className="text-[11px] font-semibold text-muted-foreground min-h-4">
                                                Nơi xuất phát
                                            </FormLabel>
                                            <FormControl>
                                                <LocationCombobox
                                                    value={field.value}
                                                    onSelect={(id) => field.onChange(id)}
                                                    placeholder={t('searchPage.selectOrigin')}
                                                />
                                            </FormControl>
                                            <FormMessage className="absolute -bottom-4 left-0 text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="destinationId"
                                    render={({ field }) => (
                                        <FormItem className="relative space-y-1">
                                            <FormLabel className="text-[11px] font-semibold text-muted-foreground min-h-4">
                                                Nơi đến
                                            </FormLabel>
                                            <FormControl>
                                                <LocationCombobox
                                                    value={field.value}
                                                    onSelect={(id) => field.onChange(id)}
                                                    placeholder={t('searchPage.selectDest')}
                                                />
                                            </FormControl>
                                            <FormMessage className="absolute -bottom-4 left-0 text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="departureDate"
                                    render={({ field }) => (
                                        <FormItem className="relative space-y-1">
                                            <FormLabel className="text-[11px] font-semibold text-muted-foreground min-h-4">
                                                Ngày đi
                                            </FormLabel>
                                            <FormControl>
                                                <DatePicker
                                                    value={field.value ? new Date(field.value) : undefined}
                                                    onChange={(date) => field.onChange(date ? date.toISOString().split('T')[0] : '')}
                                                    placeholder={t('searchPage.date')}
                                                    minDate={new Date()}
                                                    className="h-10"
                                                />
                                            </FormControl>
                                            <FormMessage className="absolute -bottom-4 left-0 text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <div className="flex items-end pt-5">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="h-10 w-full rounded-lg border border-dashed border-primary/40 text-primary hover:bg-primary/10"
                                    >
                                        <CalendarPlus2 className="h-4 w-4 mr-1" />
                                        Thêm ngày về
                                    </Button>
                                </div>

                                <div className="flex items-end pt-5">
                                    <Button
                                        type="submit"
                                        size="lg"
                                        className="h-10 w-full rounded-lg border border-primary/30 bg-primary text-primary-foreground hover:bg-primary/90 px-6"
                                    >
                                        <Search className="h-4 w-4 mr-2" />
                                        {submitLabel}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-full shadow-2xl border-0 bg-white rounded-2xl overflow-visible max-w-5xl mx-auto">
            <CardContent className="p-5 md:p-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSearch)} className="grid grid-cols-1 gap-3 md:grid-cols-4 md:items-start">
                        <FormField
                            control={form.control}
                            name="originId"
                            render={({ field }) => (
                                <FormItem className="space-y-1">
                                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground min-h-4">
                                        Nơi khởi phát
                                    </FormLabel>
                                    <FormControl>
                                        <LocationCombobox value={field.value} onSelect={(id) => field.onChange(id)} placeholder={t('searchPage.selectOrigin')} />
                                    </FormControl>
                                    <FormMessage className="text-xs min-h-4" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="destinationId"
                            render={({ field }) => (
                                <FormItem className="space-y-1">
                                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground min-h-4">
                                        Nơi đến
                                    </FormLabel>
                                    <FormControl>
                                        <LocationCombobox value={field.value} onSelect={(id) => field.onChange(id)} placeholder={t('searchPage.selectDest')} />
                                    </FormControl>
                                    <FormMessage className="text-xs min-h-4" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="departureDate"
                            render={({ field }) => (
                                <FormItem className="space-y-1">
                                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground min-h-4">
                                        Ngày đi
                                    </FormLabel>
                                    <FormControl>
                                        <DatePicker
                                            value={field.value ? new Date(field.value) : undefined}
                                            onChange={(date) => field.onChange(date ? date.toISOString().split('T')[0] : '')}
                                            placeholder={t('searchPage.date')}
                                            minDate={new Date()}
                                            className="h-11"
                                        />
                                    </FormControl>
                                    <FormMessage className="text-xs min-h-4" />
                                </FormItem>
                            )}
                        />

                        <div className="flex items-end">
                            <Button
                                type="submit"
                                size="lg"
                                className={cn(
                                    'h-11 w-full text-base font-bold shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg border border-primary/30 bg-primary text-primary-foreground hover:bg-primary/90',
                                )}
                            >
                                <Search className="h-5 w-5 mr-2" />
                                {submitLabel}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
