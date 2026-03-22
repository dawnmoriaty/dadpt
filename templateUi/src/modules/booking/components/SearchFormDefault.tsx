import { Search } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { DatePicker } from '@/components/common/date-picker'
import { LocationCombobox } from '@/components/common/location-combobox'
import { Button } from '@/components/ui/button'
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'

import type { SearchTripsFormData } from '../schemas'

interface SearchFormDefaultProps {
    form: UseFormReturn<SearchTripsFormData>
    submitLabel: string
    minDate: Date
}

export function SearchFormDefault({ form, submitLabel, minDate }: SearchFormDefaultProps) {
    const { t } = useTranslation()

    return (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:items-start">
            <FormField
                control={form.control}
                name="originId"
                render={({ field }) => (
                    <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground min-h-4">
                            Nơi khởi phát
                        </FormLabel>
                        <FormControl>
                            <LocationCombobox
                                value={field.value}
                                onSelect={(id) => field.onChange(id)}
                                placeholder={t('searchPage.selectOrigin')}
                            />
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
                            <LocationCombobox
                                value={field.value}
                                onSelect={(id) => field.onChange(id)}
                                placeholder={t('searchPage.selectDest')}
                            />
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
                                minDate={minDate}
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
                    className="h-11 w-full text-base font-bold shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg border border-primary/30 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                    <Search className="h-5 w-5 mr-2" />
                    {submitLabel}
                </Button>
            </div>
        </div>
    )
}
