import { Bot, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface ChatHeaderProps {
    canClear: boolean
    onClear: () => void
}

export function ChatHeader({ canClear, onClear }: ChatHeaderProps) {
    return (
        <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2.5">
                    <Bot className="h-5 w-5 text-primary md:h-6 md:w-6" />
                </div>
                <div className="min-w-0">
                    <h1 className="text-lg font-bold leading-tight md:text-xl">AI hỗ trợ đặt vé</h1>
                    <p className="text-xs text-muted-foreground md:text-sm">Đặt vé bằng giọng nói hoặc văn bản</p>
                </div>
            </div>
            {canClear && (
                <Button variant="outline" size="sm" onClick={onClear} className="shrink-0 gap-2">
                    <Trash2 className="h-4 w-4" />
                    Xóa
                </Button>
            )}
        </div>
    )
}
