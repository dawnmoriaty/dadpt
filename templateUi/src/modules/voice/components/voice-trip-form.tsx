import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface VoiceTripFormProps {
    origin: string
    destination: string
    travelDate: string
    seatCount: number
    seatPreferenceOrder: string
    onOriginChange: (value: string) => void
    onDestinationChange: (value: string) => void
    onTravelDateChange: (value: string) => void
    onSeatCountChange: (value: number) => void
    onSeatPreferenceOrderChange: (value: string) => void
}

export function VoiceTripForm({
    origin,
    destination,
    travelDate,
    seatCount,
    seatPreferenceOrder,
    onOriginChange,
    onDestinationChange,
    onTravelDateChange,
    onSeatCountChange,
    onSeatPreferenceOrderChange,
}: VoiceTripFormProps) {
    return (
        <>
            <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="voice-origin">Điểm đi</Label>
                    <Input id="voice-origin" value={origin} onChange={(event) => onOriginChange(event.target.value)} placeholder="Ví dụ: Sài Gòn" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="voice-destination">Điểm đến</Label>
                    <Input id="voice-destination" value={destination} onChange={(event) => onDestinationChange(event.target.value)} placeholder="Ví dụ: Nha Trang" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="voice-date">Ngày đi</Label>
                    <Input id="voice-date" value={travelDate} onChange={(event) => onTravelDateChange(event.target.value)} placeholder="Định dạng: YYYY-MM-DD" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="voice-seat-count">Số ghế</Label>
                    <Input
                        id="voice-seat-count"
                        type="number"
                        min={1}
                        max={4}
                        value={seatCount}
                        onChange={(event) => onSeatCountChange(Math.max(1, Math.min(4, Number(event.target.value) || 1)))}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="voice-seat-preference">Ghế ưu tiên (ngăn cách bằng dấu phẩy)</Label>
                <Input
                    id="voice-seat-preference"
                    value={seatPreferenceOrder}
                    onChange={(event) => onSeatPreferenceOrderChange(event.target.value)}
                    placeholder="A1, B1"
                />
            </div>
        </>
    )
}
