import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { formResolver } from '@/lib/form/resolver'

import { searchTripsSchema, type SearchTripsFormData } from '../schemas'

export function useSearchForm(defaultValues?: Partial<SearchTripsFormData>) {
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

    return {
        form,
        submitLabel: t('searchPage.searchBtn'),
        minDate: new Date(),
    }
}
