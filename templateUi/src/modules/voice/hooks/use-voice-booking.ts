import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'

import { upsertPendingBookingHistory } from '@/modules/booking'

import type { VoicePipelineResponse, VoicePlanResponse } from '../types'
import { parseSeatPreferenceOrder, parseTranscriptToPlanInput } from '../utils/voice-parser'

import { getVoiceErrorMessage, useVoiceExecute, useVoicePipeline, useVoicePlan } from './index'

interface UseVoiceBookingOptions {
    disabled?: boolean
}

export function useVoiceBooking(options: UseVoiceBookingOptions = {}) {
    const { disabled = false } = options

    const [audioUrl, setAudioUrl] = useState<string | null>(null)
    const [audioName, setAudioName] = useState('')
    const [lastTranscript, setLastTranscript] = useState('')
    const [origin, setOrigin] = useState('')
    const [destination, setDestination] = useState('')
    const [travelDate, setTravelDate] = useState('')
    const [seatCount, setSeatCount] = useState(1)
    const [seatPreferenceOrder, setSeatPreferenceOrder] = useState('')
    const [planResult, setPlanResult] = useState<VoicePlanResponse | null>(null)
    const [selectedTripId, setSelectedTripId] = useState<number | null>(null)
    const [isRecording, setIsRecording] = useState(false)

    const pipelineMutation = useVoicePipeline()
    const planMutation = useVoicePlan()
    const executeMutation = useVoiceExecute()

    const fileInputRef = useRef<HTMLInputElement>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const executeLockRef = useRef(false)

    const isBusy = disabled || pipelineMutation.isPending || planMutation.isPending || executeMutation.isPending
    const canRecord =
        typeof window !== 'undefined' &&
        typeof navigator !== 'undefined' &&
        !!navigator.mediaDevices?.getUserMedia &&
        'MediaRecorder' in window

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

    const updateAudioPreview = (file: File) => {
        setAudioName(file.name)
        setAudioUrl((currentUrl) => {
            if (currentUrl) {
                URL.revokeObjectURL(currentUrl)
            }
            return URL.createObjectURL(file)
        })
    }

    const processAudioFile = async (file: File) => {
        try {
            updateAudioPreview(file)
            const result = await pipelineMutation.mutateAsync(file)
            setLastTranscript(result.transcript)
            applyPipelinePlan(result.plan)

            const command = normalizePipelineCommand(result)
            if (command) {
                setOrigin(command.origin)
                setDestination(command.destination)
                setTravelDate(command.travelDate)
                setSeatCount(command.seatCount)
                setSeatPreferenceOrder(command.seatPreferenceOrder.join(', '))

                if (result.plan?.candidates?.length) {
                    toast.success('Đã nhận diện và gợi ý các chuyến phù hợp.')
                } else {
                    toast.success('Đã nhận diện và phân tích giọng nói.')
                }
            } else {
                toast.warning(result.parse?.message || 'Chưa nhận diện đủ thông tin chuyến đi.')

                const extracted = parseTranscriptToPlanInput(result.transcript)
                if (extracted) {
                    setOrigin(extracted.origin)
                    setDestination(extracted.destination)
                    setTravelDate(extracted.travelDate)
                    setSeatCount(extracted.seatCount)
                }
            }
        } catch (error) {
            toast.error(getVoiceErrorMessage(error))
        }
    }

    const applyPipelinePlan = (plan?: VoicePlanResponse) => {
        if (!plan) {
            return
        }

        setPlanResult(plan)
        setSelectedTripId(plan.recommendedTripId ?? null)
        setOrigin(plan.origin ?? '')
        setDestination(plan.destination ?? '')
        setTravelDate(plan.travelDate ?? '')
        setSeatCount(plan.seatCount ?? 1)
    }

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return
        await processAudioFile(file)
    }

    const handleChooseFile = () => {
        if (isBusy) return
        fileInputRef.current?.click()
    }

    const copyPaymentLink = async (paymentUrl: string) => {
        const normalizedUrl = paymentUrl.trim()
        if (!/^https:\/\/pay\.payos\.vn\/web\//i.test(normalizedUrl)) {
            toast.error('Link thanh toán không hợp lệ. Vui lòng mở lại QR thanh toán trong Vé của tôi.')
            return
        }

        await navigator.clipboard.writeText(normalizedUrl)
        toast.success('Đã copy link thanh toán. Dán vào tab mới để thanh toán.')
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

    const planTrips = async () => {
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

    const executeBooking = async (tripId?: number) => {
        if (executeLockRef.current) {
            return
        }
        if (!origin.trim() || !destination.trim() || !travelDate.trim()) {
            toast.error('Vui lòng nhập đủ điểm đi, điểm đến và ngày đi.')
            return
        }

        try {
            executeLockRef.current = true
            const result = await executeMutation.mutateAsync({
                tripId: tripId ?? selectedTripId ?? undefined,
                seatCount,
                seatPreferenceOrder: parseSeatPreferenceOrder(seatPreferenceOrder),
                paymentMethod: 'cod',
            })

            const bookingCode = result.bookingResult?.booking?.code
            if (!bookingCode) {
                toast.error('Không lấy được mã booking từ hệ thống.')
                return
            }

            const paymentUrl = result.bookingResult.paymentUrl
            upsertPendingBookingHistory(bookingCode, result.bookingResult.orderCode)
            if (paymentUrl) {
                await copyPaymentLink(paymentUrl)
                return
            }

            toast.success(`Da dat ve thanh cong. Ma ve: ${bookingCode}`)
        } catch (error) {
            toast.error(getVoiceErrorMessage(error))
        } finally {
            executeLockRef.current = false
        }
    }

    return {
        audioUrl,
        audioName,
        lastTranscript,
        origin,
        destination,
        travelDate,
        seatCount,
        seatPreferenceOrder,
        planResult,
        selectedTripId,
        isRecording,
        isBusy,
        canRecord,
        fileInputRef,
        planPending: planMutation.isPending,
        executePending: executeMutation.isPending,
        transcribePending: pipelineMutation.isPending,
        setOrigin,
        setDestination,
        setTravelDate,
        setSeatCount,
        setSeatPreferenceOrder,
        setSelectedTripId,
        handleChooseFile,
        handleFileChange,
        startRecording,
        stopRecording,
        planTrips,
        executeBooking,
    }
}

interface NormalizedPipelineCommand {
    origin: string
    destination: string
    travelDate: string
    seatCount: number
    seatPreferenceOrder: string[]
}

function normalizePipelineCommand(result: VoicePipelineResponse): NormalizedPipelineCommand | null {
    const command = result.parse?.command
    if (!command) {
        return null
    }

    return {
        origin: command.origin,
        destination: command.destination,
        travelDate: command.travelDate ?? command.travel_date ?? result.plan?.travelDate ?? '',
        seatCount: command.seatCount ?? command.seat_count ?? result.plan?.seatCount ?? 1,
        seatPreferenceOrder: command.seatPreferenceOrder ?? command.seat_preference_order ?? [],
    }
}
