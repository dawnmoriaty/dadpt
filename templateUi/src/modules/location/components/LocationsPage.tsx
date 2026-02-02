import { Filter, LayoutGrid, LayoutList, MapPin, Plus, Search } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

import { useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation } from '../hooks'
import type { Location } from '../types'

import { LocationCard } from './LocationCard'
import { LocationForm } from './LocationForm'


type ViewMode = 'grid' | 'table'

export function LocationsPage() {
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingLocation, setEditingLocation] = useState<Location | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [viewMode, setViewMode] = useState<ViewMode>('grid')

    const { data, isLoading } = useLocations({ page: 1, pageSize: 50 })
    const createMutation = useCreateLocation()
    const updateMutation = useUpdateLocation()
    const deleteMutation = useDeleteLocation()

    const handleSubmit = (formData: { name: string; city: string; address: string; keywords: string }) => {
        if (editingLocation) {
            updateMutation.mutate(
                { id: editingLocation.id, data: formData },
                { onSuccess: () => setEditingLocation(null) }
            )
        } else {
            createMutation.mutate(formData, { onSuccess: () => setIsFormOpen(false) })
        }
    }

    const filteredLocations = data?.items?.filter(
        (loc) =>
            loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            loc.city.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? []

    const cityCounts = filteredLocations.reduce((acc, loc) => {
        acc[loc.city] = (acc[loc.city] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30">
                            <MapPin className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
                            <p className="text-muted-foreground">
                                Manage {filteredLocations.length} bus stations across {Object.keys(cityCounts).length} cities
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={() => setIsFormOpen(true)}
                        className="gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:-translate-y-0.5"
                    >
                        <Plus className="h-4 w-4" />
                        Add Location
                    </Button>
                </div>

                {/* City Stats */}
                {Object.keys(cityCounts).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(cityCounts).slice(0, 5).map(([city, count]) => (
                            <Badge key={city} variant="secondary" className="gap-1.5 py-1.5 px-3">
                                <MapPin className="h-3 w-3" />
                                {city}
                                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                                    {count}
                                </span>
                            </Badge>
                        ))}
                        {Object.keys(cityCounts).length > 5 && (
                            <Badge variant="outline" className="py-1.5">
                                +{Object.keys(cityCounts).length - 5} more
                            </Badge>
                        )}
                    </div>
                )}
            </div>

            {/* Toolbar */}
            <Card className="border-0 shadow-md bg-gradient-to-r from-background to-muted/30">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or city..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 border-0 bg-background shadow-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="gap-2">
                                <Filter className="h-4 w-4" />
                                Filter
                            </Button>
                            <div className="flex items-center border rounded-lg p-1 bg-muted/50">
                                <Button
                                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => setViewMode('grid')}
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => setViewMode('table')}
                                >
                                    <LayoutList className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Content */}
            {isLoading ? (
                viewMode === 'grid' ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[...Array(6)].map((_, i) => (
                            <Card key={i} className="border-0 shadow-md">
                                <CardContent className="p-5">
                                    <div className="flex items-start gap-3">
                                        <Skeleton className="h-12 w-12 rounded-xl" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-5 w-3/4" />
                                            <Skeleton className="h-4 w-1/2" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="border-0 shadow-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>City</TableHead>
                                    <TableHead>Address</TableHead>
                                    <TableHead className="w-[100px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {[...Array(5)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-60" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                )
            ) : filteredLocations.length === 0 ? (
                <Card className="border-0 shadow-md">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <div className="p-4 rounded-full bg-muted/50 mb-4">
                            <MapPin className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <h3 className="font-semibold text-lg">No locations found</h3>
                        <p className="text-muted-foreground mt-1 text-center max-w-sm">
                            {searchQuery
                                ? `No results matching "${searchQuery}". Try a different search term.`
                                : 'Get started by adding your first bus station or terminal.'}
                        </p>
                        {!searchQuery && (
                            <Button
                                onClick={() => setIsFormOpen(true)}
                                className="mt-6 gap-2"
                                variant="outline"
                            >
                                <Plus className="h-4 w-4" />
                                Add Your First Location
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : viewMode === 'grid' ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredLocations.map((location) => (
                        <LocationCard
                            key={location.id}
                            location={location}
                            onEdit={setEditingLocation}
                            onDelete={(id) => deleteMutation.mutate(id)}
                        />
                    ))}
                </div>
            ) : (
                <Card className="border-0 shadow-md overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                <TableHead className="font-semibold">Name</TableHead>
                                <TableHead className="font-semibold">City</TableHead>
                                <TableHead className="font-semibold">Address</TableHead>
                                <TableHead className="font-semibold">Keywords</TableHead>
                                <TableHead className="font-semibold w-[120px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLocations.map((location) => (
                                <TableRow key={location.id} className="group">
                                    <TableCell className="font-medium">{location.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {location.city}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground max-w-xs truncate">
                                        {location.address || '—'}
                                    </TableCell>
                                    <TableCell>
                                        {location.keywords ? (
                                            <div className="flex gap-1">
                                                {location.keywords.split(',').slice(0, 2).map((k, i) => (
                                                    <Badge key={i} variant="outline" className="text-xs">
                                                        {k.trim()}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : '—'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setEditingLocation(location)}
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => deleteMutation.mutate(location.id)}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}

            {/* Forms */}
            <LocationForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleSubmit}
                isLoading={createMutation.isPending}
            />
            <LocationForm
                location={editingLocation}
                isOpen={!!editingLocation}
                onClose={() => setEditingLocation(null)}
                onSubmit={handleSubmit}
                isLoading={updateMutation.isPending}
            />
        </div>
    )
}
