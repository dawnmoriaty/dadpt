import { Building2, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { DataTable, DataTableViewOptions } from '@/components/common/data-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

import { useProviders, useCreateProvider, useUpdateProvider, useToggleProviderActive, useDeleteProvider } from '../hooks'
import type { Provider } from '../types'

import { ProviderForm } from './ProviderForm'
import { getProvidersColumns } from './providers-columns'

export function ProvidersPage() {
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [page, setPage] = useState(0)
    const [pageSize, setPageSize] = useState(20)

    const { data, isLoading } = useProviders({ page: page + 1, pageSize })
    const createMutation = useCreateProvider()
    const updateMutation = useUpdateProvider()
    const toggleActiveMutation = useToggleProviderActive()
    const deleteMutation = useDeleteProvider()

    const columns = useMemo(
        () =>
            getProvidersColumns({
                onEdit: setEditingProvider,
                onToggleActive: (id) => toggleActiveMutation.mutate(id),
                onDelete: (id) => deleteMutation.mutate(id),
            }),
        [toggleActiveMutation, deleteMutation],
    )

    const handleSubmit = (formData: { name: string; hotline: string; slug: string; policyRefund: string; imageUrl?: string }) => {
        if (editingProvider) {
            updateMutation.mutate(
                { id: editingProvider.id, data: formData },
                { onSuccess: () => setEditingProvider(null) }
            )
        } else {
            createMutation.mutate(formData, { onSuccess: () => setIsFormOpen(false) })
        }
    }

    const allProviders = data?.items ?? []
    const filteredProviders = allProviders.filter((provider) =>
        provider.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    const totalPages = data?.total ? Math.ceil(data.total / pageSize) : 0

    const activeCount = filteredProviders.filter((p) => p.isActive).length
    const inactiveCount = filteredProviders.length - activeCount

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-linear-to-br from-violet-500 via-purple-600 to-fuchsia-500 shadow-lg shadow-violet-500/30">
                        <Building2 className="h-7 w-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Providers</h1>
                        <p className="text-muted-foreground flex items-center gap-2">
                            <span>{data?.total ?? 0} total</span>
                            <span className="text-muted-foreground/50">•</span>
                            <span className="text-emerald-600">{activeCount} active</span>
                            <span className="text-muted-foreground/50">•</span>
                            <span className="text-muted-foreground">{inactiveCount} inactive</span>
                        </p>
                    </div>
                </div>
                <Button
                    onClick={() => setIsFormOpen(true)}
                    className="gap-2 bg-linear-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:-translate-y-0.5"
                >
                    <Plus className="h-4 w-4" />
                    Add Provider
                </Button>
            </div>

            {/* Content */}
            {isLoading ? (
                <Card className="border-0 shadow-md p-6">
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </Card>
            ) : filteredProviders.length === 0 ? (
                <Card className="border-0 shadow-md">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <div className="p-4 rounded-full bg-muted/50 mb-4">
                            <Building2 className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <h3 className="font-semibold text-lg">No providers found</h3>
                        <p className="text-muted-foreground mt-1 text-center max-w-sm">
                            {searchQuery
                                ? `No results matching "${searchQuery}".`
                                : 'Get started by adding your first bus service provider.'}
                        </p>
                        {!searchQuery && (
                            <Button
                                onClick={() => setIsFormOpen(true)}
                                className="mt-6 gap-2"
                                variant="outline"
                            >
                                <Plus className="h-4 w-4" />
                                Add Your First Provider
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <DataTable
                    columns={columns}
                    data={filteredProviders}
                    pageCount={totalPages}
                    pageIndex={page}
                    pageSize={pageSize}
                    onPaginationChange={(newPage, newSize) => {
                        setPage(newPage)
                        setPageSize(newSize)
                    }}
                    toolbar={(table) => (
                        <div className="flex items-center justify-between">
                            <div className="relative max-w-sm">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search providers..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-8 pl-9 w-[250px]"
                                />
                            </div>
                            <DataTableViewOptions table={table} />
                        </div>
                    )}
                />
            )}

            {/* Forms */}
            <ProviderForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleSubmit}
                isLoading={createMutation.isPending}
            />
            <ProviderForm
                provider={editingProvider}
                isOpen={!!editingProvider}
                onClose={() => setEditingProvider(null)}
                onSubmit={handleSubmit}
                isLoading={updateMutation.isPending}
            />
        </div>
    )
}
