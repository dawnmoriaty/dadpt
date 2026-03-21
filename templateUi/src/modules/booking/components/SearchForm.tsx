import { useTranslation } from 'react-i18next'

import { Card, CardContent } from '@/components/ui/card'
import { Form } from '@/components/ui/form'

import { useSearchForm } from '../hooks/use-search-form'
import type { SearchTripsFormData } from '../schemas'

import { SearchFormCompact } from './search-form-compact'
import { SearchFormDefault } from './search-form-default'

interface SearchFormProps {
    onSearch: (data: SearchTripsFormData) => void
    defaultValues?: Partial<SearchTripsFormData>
    compact?: boolean
}

export function SearchForm({ onSearch, defaultValues, compact }: SearchFormProps) {
    useTranslation()
    const { form, submitLabel, minDate } = useSearchForm(defaultValues)

    if (compact) {
        return (
            <Card className="w-full max-w-full border border-border/60 bg-white/95 shadow-2xl rounded-2xl overflow-visible relative z-[90]">
                <CardContent className="p-3 md:p-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSearch)} className="space-y-2">
                            <SearchFormCompact form={form} submitLabel={submitLabel} minDate={minDate} />
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
                    <form onSubmit={form.handleSubmit(onSearch)}>
                        <SearchFormDefault form={form} submitLabel={submitLabel} minDate={minDate} />
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
