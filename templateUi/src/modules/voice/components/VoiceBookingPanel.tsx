'use client'

import { AudioLines, Loader2, Mic, Square, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

import { useVoiceBooking } from '../hooks/use-voice-booking'

import { VoiceTripForm } from './VoiceTripForm'

interface VoiceBookingPanelProps {
    disabled?: boolean
}

export function VoiceBookingPanel({ disabled = false }: VoiceBookingPanelProps) {
    const {
        audioUrl,
        audioName,
        lastTranscript,
        origin,
        destination,
        travelDate,
        seatCount,
        seatPreferenceOrder,
        planResult,
        isRecording,
        isBusy,
        canRecord,
        fileInputRef,
        executePending,
        transcribePending,
        setOrigin,
        setDestination,
        setTravelDate,
        setSeatCount,
        setSeatPreferenceOrder,
        handleChooseFile,
        handleFileChange,
        startRecording,
        stopRecording,
        executeBooking,
    } = useVoiceBooking({ disabled })

    return (
        <Card className="border border-primary/20 bg-gradient-to-br from-primary/5 to-background p-5">
            <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                        <AudioLines className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-foreground">Đặt vé bằng giọng nói</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Tải file hoặc ghi âm trực tiếp. Hệ thống sẽ tự chọn chuyến gần nhất và đặt vé chưa thanh toán.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
                    <Button type="button" variant="outline" onClick={handleChooseFile} disabled={isBusy} className="gap-2">
                        {transcribePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        <span className="hidden sm:inline">Tải audio</span>
                        <span className="sm:hidden">Tải</span>
                    </Button>

                    {isRecording ? (
                        <Button type="button" variant="destructive" onClick={stopRecording} disabled={isBusy} className="gap-2">
                            <Square className="h-4 w-4" />
                            <span className="hidden sm:inline">Dừng</span>
                        </Button>
                    ) : (
                        <Button type="button" onClick={startRecording} disabled={!canRecord || isBusy} className="gap-2">
                            <Mic className="h-4 w-4" />
                            <span className="hidden sm:inline">Ghi âm</span>
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
                    <div className="rounded-lg border border-amber-200/50 bg-amber-50/50 p-3 text-xs text-amber-700">
                        Trình duyệt chưa hỗ trợ ghi âm. Bạn vẫn có thể tải file audio.
                    </div>
                )}

                {audioUrl && (
                    <div className="rounded-lg border bg-muted/50 p-3">
                        <p className="mb-2 text-xs font-medium text-foreground">📁 {audioName}</p>
                        <audio controls src={audioUrl} className="h-8 w-full" />
                    </div>
                )}

                {lastTranscript && (
                    <div className="rounded-lg border border-dashed bg-muted/30 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">📝 Nhận diện</p>
                        <p className="text-sm leading-relaxed text-foreground">{lastTranscript}</p>
                    </div>
                )}

                <VoiceTripForm
                    origin={origin}
                    destination={destination}
                    travelDate={travelDate}
                    seatCount={seatCount}
                    seatPreferenceOrder={seatPreferenceOrder}
                    onOriginChange={setOrigin}
                    onDestinationChange={setDestination}
                    onTravelDateChange={setTravelDate}
                    onSeatCountChange={setSeatCount}
                    onSeatPreferenceOrderChange={setSeatPreferenceOrder}
                />

                <div className="flex flex-col gap-3 sm:flex-row">
                    <Button type="button" onClick={executeBooking} disabled={isBusy} className="sm:flex-1">
                        {executePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Đặt chuyến gần nhất
                    </Button>
                </div>

                {planResult && planResult.candidates.length > 0 && (
                    <div className="space-y-2 rounded-xl border bg-background/80 p-3">
                        <p className="text-sm font-semibold">Hệ thống sẽ ưu tiên chuyến sớm nhất trong các chuyến tìm được</p>
                        <div className="space-y-2">
                            {planResult.candidates.slice(0, 1).map((candidate) => (
                                <div key={candidate.tripId} className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                                    <p className="font-medium">Chuyến được tự động chọn</p>
                                    <p className="mt-1 text-muted-foreground">
                                        {candidate.originName ?? origin} {'->'} {candidate.destinationName ?? destination}
                                    </p>
                                    <p className="text-muted-foreground">
                                        Khởi hành: {new Date(candidate.departureTime).toLocaleString('vi-VN')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    )
}
