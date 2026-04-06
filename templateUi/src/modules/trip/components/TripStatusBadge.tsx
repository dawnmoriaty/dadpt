import type { TripStatus } from '../types'

const statusConfig: Record<TripStatus, { color: string; bg: string; label: string }> = {
    scheduled: { color: 'text-blue-600', bg: 'bg-blue-500', label: 'Đã lên lịch' },
    departed: { color: 'text-yellow-600', bg: 'bg-yellow-500', label: 'Đã xuất bến' },
    completed: { color: 'text-emerald-600', bg: 'bg-emerald-500', label: 'Hoàn thành' },
    cancelled: { color: 'text-red-600', bg: 'bg-red-500', label: 'Đã hủy' },
}

interface TripStatusBadgeProps {
    status: TripStatus
}

export function TripStatusBadge({ status }: TripStatusBadgeProps) {
    const config = statusConfig[status]
    
    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background shadow-sm border`}>
            <span className={`relative flex h-2 w-2`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.bg} opacity-75`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${config.bg}`} />
            </span>
            <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
        </div>
    )
}
