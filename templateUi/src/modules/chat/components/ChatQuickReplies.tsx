import { Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'

import type { ChatQuickReplyOption } from '../types'

interface ChatQuickRepliesProps {
    options: ChatQuickReplyOption[]
    disabled?: boolean
    onSelect: (value: string) => void
}

export function ChatQuickReplies({ options, disabled, onSelect }: ChatQuickRepliesProps) {
    if (!options.length) {
        return null
    }

    return (
        <div className="flex flex-wrap gap-2">
            {options.map((option, index) => (
                <Button
                    key={`quick-reply-${index}-${option.value}`}
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={disabled}
                    className="rounded-full border-primary/25 bg-background text-xs text-foreground shadow-sm hover:border-primary/40 hover:bg-primary/5"
                    onClick={() => onSelect(option.value)}
                >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
                    {option.label}
                </Button>
            ))}
        </div>
    )
}
