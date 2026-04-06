import type { VoiceTripCandidate } from '../types'

interface VoiceCandidateCardProps {
    candidate: VoiceTripCandidate
    selected: boolean
    recommended: boolean
    onSelect: () => void
}

export function VoiceCandidateCard({ candidate, selected, recommended, onSelect }: VoiceCandidateCardProps) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`w-full rounded-lg border p-3 text-left transition ${selected ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'}`}
        >
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                    {candidate.originName} {'->'} {candidate.destinationName}
                </p>
                <div className="flex items-center gap-2">
                    {recommended && <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Gợi ý</span>}
                    {selected && <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">Đã chọn</span>}
                </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
                {candidate.departureTime} - {candidate.arrivalTime}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
                Nhà xe: {candidate.providerName || 'Không rõ'} | Loại xe: {candidate.busTypeName || 'Không rõ'}
            </p>
            <p className="mt-1 text-sm font-semibold">{Math.round(candidate.finalPrice).toLocaleString('vi-VN')} VND</p>
            {candidate.suggestedSeatCodes?.length ? (
                <p className="mt-1 text-xs text-muted-foreground">Ghế gợi ý: {candidate.suggestedSeatCodes.join(', ')}</p>
            ) : null}
        </button>
    )
}
