import { Building2, MoreHorizontal, Plus, Power, Search } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

import { useProviders, useCreateProvider, useUpdateProvider, useToggleProviderActive, useDeleteProvider } from '../hooks'
import type { Provider } from '../types'

import { ProviderForm } from './ProviderForm'

export function ProvidersPage() {
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    const { data, isLoading } = useProviders({ page: 1, pageSize: 50 })
    const createMutation = useCreateProvider()
    const updateMutation = useUpdateProvider()
    const toggleActiveMutation = useToggleProviderActive()
    const deleteMutation = useDeleteProvider()

    const handleSubmit = (formData: { name: string; hotline: string; slug: string; policyRefund: string }) => {
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

    const activeCount = filteredProviders.filter(p => p.isActive).length
    const inactiveCount = filteredProviders.length - activeCount

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-500 shadow-lg shadow-violet-500/30">
                        <Building2 className="h-7 w-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Providers</h1>
                        <p className="text-muted-foreground flex items-center gap-2">
                            <span>{filteredProviders.length} total</span>
                            <span className="text-muted-foreground/50">•</span>
                            <span className="text-emerald-600">{activeCount} active</span>
                            <span className="text-muted-foreground/50">•</span>
                            <span className="text-muted-foreground">{inactiveCount} inactive</span>
                        </p>
                    </div>
                </div>
                <Button
                    onClick={() => setIsFormOpen(true)}
                    className="gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:-translate-y-0.5"
                >
                    <Plus className="h-4 w-4" />
                    Add Provider
                </Button>
            </div>

            {/* Toolbar */}
            <Card className="border-0 shadow-md bg-gradient-to-r from-background to-muted/30">
                <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search providers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 border-0 bg-background shadow-sm"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Content */}
            {isLoading ? (
                <Card className="border-0 shadow-md">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead>Provider</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Hotline</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
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
                <Card className="border-0 shadow-md overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                <TableHead className="font-semibold">Provider</TableHead>
                                <TableHead className="font-semibold w-[120px]">Status</TableHead>
                                <TableHead className="font-semibold">Hotline</TableHead>
                                <TableHead className="font-semibold">Slug</TableHead>
                                <TableHead className="font-semibold w-[80px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProviders.map((provider) => (
                                <TableRow key={provider.id} className={`group ${!provider.isActive ? 'opacity-60' : ''}`}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-white font-semibold ${provider.isActive
                                                    ? 'bg-gradient-to-br from-violet-500 to-purple-600'
                                                    : 'bg-gray-400'
                                                }`}>
                                                {provider.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium">{provider.name}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={provider.isActive ? 'success' : 'secondary'} className="gap-1">
                                            <span className={`h-1.5 w-1.5 rounded-full ${provider.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                            {provider.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {provider.hotline || '—'}
                                    </TableCell>
                                    <TableCell>
                                        <code className="text-xs bg-muted px-2 py-1 rounded">
                                            /{provider.slug}
                                        </code>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => toggleActiveMutation.mutate(provider.id)}>
                                                    <Power className="h-4 w-4 mr-2" />
                                                    {provider.isActive ? 'Deactivate' : 'Activate'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setEditingProvider(provider)}>
                                                    Edit Provider
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive"
                                                    onClick={() => deleteMutation.mutate(provider.id)}
                                                    disabled={provider.isActive}
                                                >
                                                    Delete Provider
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
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
