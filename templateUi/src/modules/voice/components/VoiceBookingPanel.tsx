import { AudioLines, Loader2, Mic, Square, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { getVoiceErrorMessage, useTranscribeVoice, useVoiceExecute, useVoicePlan } from '../hooks'
import type { VoicePlanResponse, VoiceTripCandidate } from '../types'

interface VoiceBookingPanelProps {
    disabled?: boolean
}

export function VoiceBookingPanel({ disabled = false }: VoiceBookingPanelProps) {
    const [audioUrl, setAudioUrl] = useState<string | null>(null)
    const [audioName, setAudioName] = useState<string>('')
    const [lastTranscript, setLastTranscript] = useState<string>('')
    const [origin, setOrigin] = useState('')
    const [destination, setDestination] = useState('')
    const [travelDate, setTravelDate] = useState('')
    const [seatCount, setSeatCount] = useState(1)
    const [seatPreferenceOrder, setSeatPreferenceOrder] = useState('')
    const [planResult, setPlanResult] = useState<VoicePlanResponse | null>(null)
    const [selectedTripId, setSelectedTripId] = useState<number | null>(null)
    const [isRecording, setIsRecording] = useState(false)

    const transcribeMutation = useTranscribeVoice()
    const planMutation = useVoicePlan()
    const executeMutation = useVoiceExecute()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const chunksRef = useRef<Blob[]>([])

    useEffect(() => {
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl)
            }

            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop())
            }
        }
    }, [audioUrl])

    const isBusy = disabled || transcribeMutation.isPending || planMutation.isPending || executeMutation.isPending
    const canRecord = typeof window !== 'undefined'
        && typeof navigator !== 'undefined'
        && !!navigator.mediaDevices?.getUserMedia
        && 'MediaRecorder' in window

    const handleChooseFile = () => {
        if (isBusy) return
        fileInputRef.current?.click()
    }

    const processAudioFile = async (file: File) => {
        try {
            updateAudioPreview(file)
            const result = await transcribeMutation.mutateAsync(file)
            setLastTranscript(result.transcript)
            toast.success(`Đã nhận diện giọng nói bằng ${result.engine}.`)

            const extracted = parseTranscriptToPlanInput(result.transcript)
            if (extracted) {
                setOrigin(extracted.origin)
                setDestination(extracted.destination)
                setTravelDate(extracted.travelDate)
                setSeatCount(extracted.seatCount)
            }
        } catch (error) {
            toast.error(getVoiceErrorMessage(error))
        }
    }

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return
        await processAudioFile(file)
    }

    const updateAudioPreview = (file: File) => {
        setAudioName(file.name)
        setAudioUrl((currentUrl) => {
            if (currentUrl) {
                URL.revokeObjectURL(currentUrl)
            }
            return URL.createObjectURL(file)
        })
    }

    const startRecording = async () => {
        if (!canRecord || isBusy) return

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)

            chunksRef.current = []
            streamRef.current = stream
            mediaRecorderRef.current = mediaRecorder

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data)
                }
            }

            mediaRecorder.onstop = async () => {
                const blobType = mediaRecorder.mimeType || 'audio/webm'
                const blob = new Blob(chunksRef.current, { type: blobType })
                const extension = blobType.includes('ogg') ? 'ogg' : blobType.includes('mp4') ? 'm4a' : 'webm'
                const file = new File([blob], `voice-booking-${Date.now()}.${extension}`, { type: blobType })

                stream.getTracks().forEach((track) => track.stop())
                streamRef.current = null
                mediaRecorderRef.current = null
                setIsRecording(false)

                await processAudioFile(file)
            }

            mediaRecorder.start()
            setIsRecording(true)
            toast.success('Đang ghi âm. Nhấn dừng khi đọc xong.')
        } catch (error) {
            toast.error(getVoiceErrorMessage(error))
        }
    }

    const stopRecording = () => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return
        mediaRecorderRef.current.stop()
    }

    const handlePlan = async () => {
        if (!origin.trim() || !destination.trim() || !travelDate.trim()) {
            toast.error('Vui lòng nhập đủ điểm đi, điểm đến và ngày đi.')
            return
        }

        try {
            const planned = await planMutation.mutateAsync({
                origin: origin.trim(),
                destination: destination.trim(),
                travelDate: travelDate.trim(),
                seatCount,
                seatPreferenceOrder: parseSeatPreferenceOrder(seatPreferenceOrder),
            })
            setPlanResult(planned)
            setSelectedTripId(planned.recommendedTripId)
            toast.success('Đã tìm được chuyến phù hợp. Bạn chọn chuyến để đặt vé.')
        } catch (error) {
            toast.error(getVoiceErrorMessage(error))
        }
    }

    const handleExecute = async () => {
        if (!selectedTripId) {
            toast.error('Vui lòng chọn một chuyến trước khi đặt.')
            return
        }

        try {
            const result = await executeMutation.mutateAsync({
                tripId: selectedTripId,
                seatCount,
                seatPreferenceOrder: parseSeatPreferenceOrder(seatPreferenceOrder),
                paymentMethod: 'bank_transfer',
            })

            const paymentUrl = result.bookingResult.paymentUrl
            if (paymentUrl) {
                toast.success('Đặt vé thành công. Chuyển đến trang thanh toán.')
                window.open(paymentUrl, '_blank', 'noopener,noreferrer')
                return
            }

            toast.success('Đặt vé thành công.')
        } catch (error) {
            toast.error(getVoiceErrorMessage(error))
        }
    }

    return (
        <Card className="border-primary/15 bg-gradient-to-br from-primary/5 via-background to-emerald-50/60 p-4">
            <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                        <AudioLines className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="font-semibold">Đặt vé bằng giọng nói</h2>
                        <p className="text-sm text-muted-foreground">
                            Tải file audio lên hoặc ghi âm trực tiếp. Hệ thống sẽ tự nhận diện nội dung và xử lý đặt vé.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <Button type="button" variant="outline" onClick={handleChooseFile} disabled={isBusy} className="sm:flex-1">
                        {transcribeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Tải audio lên
                    </Button>

                    {isRecording ? (
                        <Button type="button" variant="destructive" onClick={stopRecording} disabled={isBusy} className="sm:flex-1">
                            <Square className="mr-2 h-4 w-4" />
                            Dừng ghi âm
                        </Button>
                    ) : (
                        <Button type="button" onClick={startRecording} disabled={!canRecord || isBusy} className="sm:flex-1">
                            <Mic className="mr-2 h-4 w-4" />
                            Ghi âm trực tiếp
                        </Button>
                    )}
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg"
                    className="hidden"
                    onChange={handleFileChange}
                />

                {!canRecord && (
                    <p className="text-xs text-amber-700">
                        Trình duyệt hiện tại chưa hỗ trợ ghi âm trực tiếp. Bạn vẫn có thể tải file audio lên để xử lý.
                    </p>
                )}

                {audioUrl && (
                    <div className="rounded-xl border bg-background/80 p-3">
                        <p className="mb-2 text-sm font-medium">Audio gần nhất: {audioName}</p>
                        <audio controls src={audioUrl} className="w-full" />
                    </div>
                )}

                {lastTranscript && (
                    <div className="rounded-xl border border-dashed bg-background/80 p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Transcript
                        </p>
                        <p className="text-sm leading-relaxed">{lastTranscript}</p>
                    </div>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="voice-origin">Điểm đi</Label>
                        <Input id="voice-origin" value={origin} onChange={(event) => setOrigin(event.target.value)} placeholder="Ví dụ: Sài Gòn" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="voice-destination">Điểm đến</Label>
                        <Input id="voice-destination" value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Ví dụ: Nha Trang" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="voice-date">Ngày đi</Label>
                        <Input id="voice-date" value={travelDate} onChange={(event) => setTravelDate(event.target.value)} placeholder="YYYY-MM-DD" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="voice-seat-count">Số ghế</Label>
                        <Input
                            id="voice-seat-count"
                            type="number"
                            min={1}
                            max={4}
                            value={seatCount}
                            onChange={(event) => setSeatCount(Math.max(1, Math.min(4, Number(event.target.value) || 1)))}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="voice-seat-preference">Ghế ưu tiên (ngăn cách bằng dấu phẩy)</Label>
                    <Input
                        id="voice-seat-preference"
                        value={seatPreferenceOrder}
                        onChange={(event) => setSeatPreferenceOrder(event.target.value)}
                        placeholder="A1, B1"
                    />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <Button type="button" variant="outline" onClick={handlePlan} disabled={isBusy} className="sm:flex-1">
                        {planMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Gợi ý chuyến
                    </Button>
                    <Button type="button" onClick={handleExecute} disabled={isBusy || !selectedTripId} className="sm:flex-1">
                        {executeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Đặt chuyến đã chọn
                    </Button>
                </div>

                {planResult && (
                    <div className="space-y-2 rounded-xl border bg-background/80 p-3">
                        <p className="text-sm font-semibold">Các chuyến đề xuất</p>
                        <div className="space-y-2">
                            {planResult.candidates.map((candidate) => (
                                <CandidateCard
                                    key={candidate.tripId}
                                    candidate={candidate}
                                    selected={selectedTripId === candidate.tripId}
                                    recommended={planResult.recommendedTripId === candidate.tripId}
                                    onSelect={() => setSelectedTripId(candidate.tripId)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    )
}

interface CandidateCardProps {
    candidate: VoiceTripCandidate
    selected: boolean
    recommended: boolean
    onSelect: () => void
}

function CandidateCard({ candidate, selected, recommended, onSelect }: CandidateCardProps) {
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
            <p className="mt-1 text-xs text-muted-foreground">{candidate.departureTime} - {candidate.arrivalTime}</p>
            <p className="mt-1 text-xs text-muted-foreground">Nhà xe: {candidate.providerName || 'N/A'} | Loại xe: {candidate.busTypeName || 'N/A'}</p>
            <p className="mt-1 text-sm font-semibold">{Math.round(candidate.finalPrice).toLocaleString('vi-VN')} VND</p>
            {candidate.suggestedSeatCodes?.length ? (
                <p className="mt-1 text-xs text-muted-foreground">Ghế gợi ý: {candidate.suggestedSeatCodes.join(', ')}</p>
            ) : null}
        </button>
    )
}

function parseSeatPreferenceOrder(raw: string): string[] {
    if (!raw.trim()) {
        return []
    }
    return raw
        .split(',')
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean)
}

function parseTranscriptToPlanInput(transcript: string): { origin: string; destination: string; travelDate: string; seatCount: number } | null {
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
