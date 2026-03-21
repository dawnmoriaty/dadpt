import { CalendarPlus2, Search } from 'lucide-react'
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

interface SearchFormCompactProps {
    form: UseFormReturn<SearchTripsFormData>
    submitLabel: string
    minDate: Date
}

export function SearchFormCompact({ form, submitLabel, minDate }: SearchFormCompactProps) {
    const { t } = useTranslation()

    return (
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
                                minDate={minDate}
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
    )
}
