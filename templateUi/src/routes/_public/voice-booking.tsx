import { createFileRoute } from '@tanstack/react-router'

import { VoiceBookingPanel } from '@/modules/voice'

export const Route = createFileRoute('/_public/voice-booking')({
    component: VoiceBookingPage,
})

function VoiceBookingPage() {
    return (
        <div className="container mx-auto max-w-4xl px-4 py-6">
            <div className="mb-4 space-y-1">
                <h1 className="text-2xl font-bold">Dat ve bang giong noi</h1>
                <p className="text-sm text-muted-foreground">
                    Tai audio hoac ghi am, he thong se goi y chuyen va ban co the chon chuyen de dat.
                </p>
            </div>
            <VoiceBookingPanel />
        </div>
    )
}
