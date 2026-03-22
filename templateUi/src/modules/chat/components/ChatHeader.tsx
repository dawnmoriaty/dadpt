import { Bot, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface ChatHeaderProps {
    canClear: boolean
    onClear: () => void
}

export function ChatHeader({ canClear, onClear }: ChatHeaderProps) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                    <Bot className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">AI hỗ trợ đặt vé</h1>
                    <p className="text-sm text-muted-foreground">Đặt vé bằng giọng nói hoặc văn bản</p>
                </div>
            </div>
            {canClear && (
                <Button variant="outline" size="sm" onClick={onClear} className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Xóa
                </Button>
            )}
        </div>
    )
}
