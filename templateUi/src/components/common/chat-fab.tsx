import { Link } from '@tanstack/react-router'
import { MessageCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function ChatFab() {
    return (
        <div className="fixed bottom-6 left-6 z-40">
            <Button
                asChild
                size="icon"
                className="h-12 w-12 rounded-full shadow-lg"
                aria-label="Mở chat AI"
            >
                <Link to="/chat">
                    <MessageCircle className="h-5 w-5" />
                </Link>
            </Button>
        </div>
    )
}
