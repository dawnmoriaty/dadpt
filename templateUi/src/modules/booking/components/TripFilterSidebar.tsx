import { Bus, Filter, SlidersHorizontal, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { usePublicBusTypes } from '@/modules/bustype'
import { useActiveProviders } from '@/modules/provider'

export interface TripFilters {
    providerIds: number[]
    busTypeIds: number[]
}

interface TripFilterSidebarProps {
    filters: TripFilters
    onChange: (filters: TripFilters) => void
}

function CheckboxItem({
    label,
    checked,
    onChange,
}: {
    label: string
    checked: boolean
    onChange: (checked: boolean) => void
}) {
    return (
        <label className="flex items-center gap-2.5 py-1.5 cursor-pointer group">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30 accent-primary cursor-pointer"
            />
            <span className="text-sm text-foreground group-hover:text-primary transition-colors truncate">
                {label}
            </span>
        </label>
    )
}

export function TripFilterSidebar({ filters, onChange }: TripFilterSidebarProps) {
    const { t } = useTranslation()
    const { data: providers, isLoading: loadingProviders } = useActiveProviders()
    const { data: busTypes, isLoading: loadingBusTypes } = usePublicBusTypes()
    const [mobileOpen, setMobileOpen] = useState(false)

    const toggleProvider = useCallback(
        (id: number, checked: boolean) => {
            onChange({
                ...filters,
                providerIds: checked
                    ? [...filters.providerIds, id]
                    : filters.providerIds.filter((pid) => pid !== id),
            })
        },
        [filters, onChange],
    )

    const toggleBusType = useCallback(
        (id: number, checked: boolean) => {
            onChange({
                ...filters,
                busTypeIds: checked
                    ? [...filters.busTypeIds, id]
                    : filters.busTypeIds.filter((bid) => bid !== id),
            })
        },
        [filters, onChange],
    )

    const clearAll = () => onChange({ providerIds: [], busTypeIds: [] })
    const activeCount = filters.providerIds.length + filters.busTypeIds.length

    const sidebarContent = (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">{t('filter.title', 'Bộ lọc')}</h3>
                    {activeCount > 0 && (
                        <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-primary text-primary-foreground text-xs font-medium px-1.5">
                            {activeCount}
                        </span>
                    )}
                </div>
                {activeCount > 0 && (
                    <button
                        onClick={clearAll}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                        {t('filter.clearAll', 'Xóa tất cả')}
                    </button>
                )}
            </div>

            <Separator />

            {/* Provider filter */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Bus className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">{t('filter.provider', 'Nhà xe')}</h4>
                </div>
                {loadingProviders ? (
                    <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-5 bg-muted rounded animate-pulse" />
                        ))}
                    </div>
                ) : providers && providers.length > 0 ? (
                    <div className="space-y-0.5 max-h-52 overflow-y-auto pr-1">
                        {providers.map((p) => (
                            <CheckboxItem
                                key={p.id}
                                label={p.name}
                                checked={filters.providerIds.includes(p.id)}
                                onChange={(checked) => toggleProvider(p.id, checked)}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground">{t('filter.noData', 'Không có dữ liệu')}</p>
                )}
            </div>

            <Separator />

            {/* Bus type filter */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">{t('filter.busType', 'Loại xe')}</h4>
                </div>
                {loadingBusTypes ? (
                    <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-5 bg-muted rounded animate-pulse" />
                        ))}
                    </div>
                ) : busTypes && busTypes.length > 0 ? (
                    <div className="space-y-0.5">
                        {busTypes.map((bt) => (
                            <CheckboxItem
                                key={bt.id}
                                label={`${bt.name} (${bt.totalSeats} ghế)`}
                                checked={filters.busTypeIds.includes(bt.id)}
                                onChange={(checked) => toggleBusType(bt.id, checked)}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground">{t('filter.noData', 'Không có dữ liệu')}</p>
                )}
            </div>
        </div>
    )

    return (
        <>
            {/* Mobile toggle button */}
            <div className="lg:hidden mb-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="gap-2"
                >
                    <SlidersHorizontal className="h-4 w-4" />
                    {t('filter.title', 'Bộ lọc')}
                    {activeCount > 0 && (
                        <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-primary text-primary-foreground text-xs font-medium px-1.5">
                            {activeCount}
                        </span>
                    )}
                </Button>
            </div>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
                    <div className="absolute left-0 top-0 bottom-0 w-80 bg-background p-5 shadow-xl overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">{t('filter.title', 'Bộ lọc')}</h3>
                            <button onClick={() => setMobileOpen(false)}>
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        {sidebarContent}
                    </div>
                </div>
            )}

            {/* Desktop sidebar */}
            <Card className="hidden lg:block sticky top-4">
                <CardContent className="p-5">
                    {sidebarContent}
                </CardContent>
            </Card>
        </>
    )
}
