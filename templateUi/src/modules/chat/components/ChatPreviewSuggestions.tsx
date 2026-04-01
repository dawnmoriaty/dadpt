import { LayoutTemplate } from 'lucide-react'

import type { TripUiActionItem } from '../types'

import { ChatTripActionCard } from './ChatTripActionCard'

const previewTrips: TripUiActionItem[] = [
    {
        trip_id: 1,
        provider_name: 'HomeBus Limousine',
        origin_name: 'Sài Gòn',
        destination_name: 'Nha Trang',
        departure_time: '2026-04-01T21:30:00+07:00',
        arrival_time: '2026-04-02T05:45:00+07:00',
        price: 320000,
        available_seats: 12,
        status: 'scheduled',
        image_url: '/chat-trip-preview.svg',
        tags: ['premium'],
        score_explain: {
            reasons: ['Đi đêm thoải mái, đến nơi sáng sớm'],
        },
        book_now: {
            trip_id: 1,
            passengers: 1,
            payment_method: 'cod',
        },
    },
    {
        trip_id: 2,
        provider_name: 'Sunrise Sleeper',
        origin_name: 'Hà Nội',
        destination_name: 'Đà Nẵng',
        departure_time: '2026-04-02T07:00:00+07:00',
        arrival_time: '2026-04-02T19:30:00+07:00',
        price: 540000,
        available_seats: 5,
        status: 'scheduled',
        image_url: '/chat-trip-preview.svg',
        tags: ['best_price'],
        score_explain: {
            reasons: ['Giá tốt trong khung giờ bạn chọn'],
        },
        book_now: {
            trip_id: 2,
            passengers: 1,
            payment_method: 'cod',
        },
    },
]

export function ChatPreviewSuggestions() {
    return (
        <div className="mt-5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                <LayoutTemplate className="h-3.5 w-3.5" />
                Preview component ideas
            </div>

            <div className="space-y-2.5">
                {previewTrips.map((trip) => (
                    <ChatTripActionCard key={`preview-trip-${trip.trip_id}`} item={trip} defaultPassengers={1} />
                ))}
            </div>
        </div>
    )
}
