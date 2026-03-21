export function parseSeatPreferenceOrder(raw: string): string[] {
    if (!raw.trim()) {
        return []
    }

    return raw
        .split(',')
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean)
}

export interface ParsedVoicePlanInput {
    origin: string
    destination: string
    travelDate: string
    seatCount: number
}

export function parseTranscriptToPlanInput(transcript: string): ParsedVoicePlanInput | null {
    const normalized = transcript.replace(/\s+/g, ' ').trim()
    const routeMatch = normalized.match(/từ\s+(.+?)\s+đ(?:ế|i)n\s+(.+?)(?:\s+ngày\s+|$)/i)
    const dateMatch = normalized.match(/(\d{4}-\d{2}-\d{2})/)
    const seatMatch = normalized.match(/(\d+)\s*(ghế|vé|chỗ)/i)

    if (!routeMatch || !dateMatch) {
        return null
    }

    return {
        origin: routeMatch[1].trim(),
        destination: routeMatch[2].trim(),
        travelDate: dateMatch[1],
        seatCount: seatMatch ? Math.max(1, Math.min(4, Number(seatMatch[1]))) : 1,
    }
}
