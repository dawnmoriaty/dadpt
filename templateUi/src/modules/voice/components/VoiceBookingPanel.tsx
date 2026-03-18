import { AudioLines, Loader2, Mic, Square, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

import { getVoiceErrorMessage, useTranscribeVoice } from '../hooks'

interface VoiceBookingPanelProps {
    onTranscript: (transcript: string) => Promise<void> | void
    disabled?: boolean
}

export function VoiceBookingPanel({ onTranscript, disabled = false }: VoiceBookingPanelProps) {
    const [audioUrl, setAudioUrl] = useState<string | null>(null)
    const [audioName, setAudioName] = useState<string>('')
    const [lastTranscript, setLastTranscript] = useState<string>('')
    const [isRecording, setIsRecording] = useState(false)
    const [isSubmittingTranscript, setIsSubmittingTranscript] = useState(false)

    const transcribeMutation = useTranscribeVoice()
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

    const isBusy = disabled || transcribeMutation.isPending || isSubmittingTranscript
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

            setIsSubmittingTranscript(true)
            await onTranscript(result.transcript)
        } catch (error) {
            toast.error(getVoiceErrorMessage(error))
        } finally {
            setIsSubmittingTranscript(false)
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
            </div>
        </Card>
    )
}
