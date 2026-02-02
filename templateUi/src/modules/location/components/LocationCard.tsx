import { Pencil, Trash2, MapPin } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

import type { Location } from '../types'

interface LocationCardProps {
    location: Location
    onEdit: (location: Location) => void
    onDelete: (id: number) => void
}

export function LocationCard({ location, onEdit, onDelete }: LocationCardProps) {
    return (
        <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 group-hover:from-blue-500/10 group-hover:to-cyan-500/10 transition-all" />
            <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/20">
                            <MapPin className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">
                                {location.name}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                {location.city}
                            </p>
                            {location.address && (
                                <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">
                                    {location.address}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-blue-500/10 hover:text-blue-600"
                            onClick={() => onEdit(location)}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => onDelete(location.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                {location.keywords && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {location.keywords.split(',').slice(0, 3).map((keyword, i) => (
                            <span 
                                key={i} 
                                className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground"
                            >
                                {keyword.trim()}
                            </span>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
