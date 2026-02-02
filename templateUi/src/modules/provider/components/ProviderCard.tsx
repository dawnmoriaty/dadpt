import { Pencil, Trash2, Power, Building2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

import type { Provider } from '../types'

interface ProviderCardProps {
    provider: Provider
    onEdit: (provider: Provider) => void
    onToggleActive: (id: number) => void
    onDelete: (id: number) => void
}

export function ProviderCard({ provider, onEdit, onToggleActive, onDelete }: ProviderCardProps) {
    return (
        <Card className={`group relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${!provider.isActive ? 'opacity-60' : ''}`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${provider.isActive ? 'from-violet-500/5 to-purple-500/5 group-hover:from-violet-500/10 group-hover:to-purple-500/10' : 'from-gray-500/5 to-gray-500/5'} transition-all`} />
            <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`p-2.5 rounded-xl shadow-lg ${provider.isActive ? 'bg-gradient-to-br from-violet-500 to-purple-500 shadow-violet-500/20' : 'bg-gray-400'}`}>
                            <Building2 className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-foreground truncate">
                                    {provider.name}
                                </h3>
                                {provider.isActive ? (
                                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                        Active
                                    </span>
                                ) : (
                                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-500/10 text-gray-600 border border-gray-500/20">
                                        Inactive
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                /{provider.slug}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${provider.isActive ? 'hover:bg-emerald-500/10 text-emerald-500' : 'hover:bg-gray-500/10 text-gray-400'}`}
                            onClick={() => onToggleActive(provider.id)}
                            title={provider.isActive ? 'Deactivate' : 'Activate'}
                        >
                            <Power className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-violet-500/10 hover:text-violet-600"
                            onClick={() => onEdit(provider)}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => onDelete(provider.id)}
                            disabled={provider.isActive}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                
                {provider.hotline && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Hotline</p>
                        <p className="text-sm font-medium mt-0.5">{provider.hotline}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
