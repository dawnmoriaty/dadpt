import { createFileRoute } from '@tanstack/react-router'

import { VoiceBookingPanel } from '@/modules/voice'

export const Route = createFileRoute('/_public/voice-booking')({
    component: VoiceBookingPage,
})

function VoiceBookingPage() {
    return (
        <div className="container mx-auto max-w-4xl px-4 py-6">
            <div className="mb-4 space-y-1">
                <h1 className="text-2xl font-bold">Đặt vé bằng giọng nói</h1>
                <p className="text-sm text-muted-foreground">
                    Tải audio hoặc ghi âm, hệ thống sẽ gợi ý chuyến và bạn có thể chọn chuyến để đặt.
                </p>
            </div>
            <VoiceBookingPanel />
        </div>
    )
}
