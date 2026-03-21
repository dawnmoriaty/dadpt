import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'

import type { VoicePlanResponse } from '../types'
import { parseSeatPreferenceOrder, parseTranscriptToPlanInput } from '../utils/voice-parser'

import { getVoiceErrorMessage, useTranscribeVoice, useVoiceExecute, useVoicePlan } from './index'

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

    const transcribeMutation = useTranscribeVoice()
    const planMutation = useVoicePlan()
    const executeMutation = useVoiceExecute()

    const fileInputRef = useRef<HTMLInputElement>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const chunksRef = useRef<Blob[]>([])

    const isBusy = disabled || transcribeMutation.isPending || planMutation.isPending || executeMutation.isPending
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
            const result = await transcribeMutation.mutateAsync(file)
            setLastTranscript(result.transcript)
            toast.success(`Da nhan dien giong noi bang ${result.engine}.`)

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

    const handleChooseFile = () => {
        if (isBusy) return
        fileInputRef.current?.click()
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
            toast.success('Dang ghi am. Nhan dung khi doc xong.')
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
            toast.error('Vui long nhap du diem di, diem den va ngay di.')
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
            toast.success('Da tim duoc chuyen phu hop. Ban chon chuyen de dat ve.')
        } catch (error) {
            toast.error(getVoiceErrorMessage(error))
        }
    }

    const executeBooking = async () => {
        if (!selectedTripId) {
            toast.error('Vui long chon mot chuyen truoc khi dat.')
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
                toast.success('Dat ve thanh cong. Chuyen den trang thanh toan.')
                window.open(paymentUrl, '_blank', 'noopener,noreferrer')
                return
            }

            toast.success('Dat ve thanh cong.')
        } catch (error) {
            toast.error(getVoiceErrorMessage(error))
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
        transcribePending: transcribeMutation.isPending,
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
