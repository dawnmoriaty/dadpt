import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'

import { upsertPendingBookingHistory } from '@/modules/booking'

import type { VoiceExecuteResponse, VoicePlanResponse } from '../types'
import { parseSeatPreferenceOrder, parseTranscriptToPlanInput } from '../utils/voice-parser'

import { getVoiceErrorMessage, useVoiceExecute, useVoicePipeline, useVoicePlan } from './index'

interface UseVoiceBookingOptions {
    disabled?: boolean
}

export function useVoiceBooking(options: UseVoiceBookingOptions = {}) {
    const { disabled = false } = options
    const navigate = useNavigate()

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

            const executeFromPipeline = result.execute as VoiceExecuteResponse | undefined
            if (executeFromPipeline?.bookingResult?.booking?.code) {
                const paymentUrl = executeFromPipeline.bookingResult.paymentUrl
                const bookingCode = executeFromPipeline.bookingResult.booking.code
                const orderCode = executeFromPipeline.bookingResult.orderCode

                upsertPendingBookingHistory(bookingCode, orderCode)

                setOrigin(executeFromPipeline.origin ?? '')
                setDestination(executeFromPipeline.destination ?? '')
                setTravelDate(executeFromPipeline.travelDate ?? '')
                setSeatCount(executeFromPipeline.seatCodes?.length || 1)
                setSeatPreferenceOrder(executeFromPipeline.seatCodes?.join(', ') ?? '')

                toast.success('Đã đặt vé tự động từ giọng nói.')

                if (paymentUrl) {
                    if (bookingCode) {
                        void navigate({
                            to: '/payment/$bookingCode',
                            params: { bookingCode },
                            search: { orderCode },
                        })
                        return
                    }
                    window.location.href = paymentUrl
                    return
                }
            }

            const command = result.parse?.command
            if (command) {
                setOrigin(command.origin)
                setDestination(command.destination)
                setTravelDate(command.travel_date)
                setSeatCount(command.seat_count)
                setSeatPreferenceOrder((command.seat_preference_order ?? []).join(', '))
                toast.success('Đã nhận diện và phân tích giọng nói.')
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
            const resumeUrl = result.bookingResult.resumeUrl
            upsertPendingBookingHistory(result.bookingResult.booking.code, result.bookingResult.orderCode)
            if (paymentUrl) {
                toast.success('Đặt vé thành công. Chuyển sang trang thanh toán.')
                if (resumeUrl && result.bookingResult.booking?.code) {
                    void navigate({
                        to: '/payment/$bookingCode',
                        params: { bookingCode: result.bookingResult.booking.code },
                        search: { orderCode: result.bookingResult.orderCode },
                    })
                    return
                }
                window.location.href = paymentUrl
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
