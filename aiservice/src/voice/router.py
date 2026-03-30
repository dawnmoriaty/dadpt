"""Voice booking API router (new isolated flow)."""

from __future__ import annotations

import aiohttp
import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from src.voice.parser import build_parse_result
from src.voice.schemas import (
    VoiceBookingExecuteInput,
    VoiceBookingParseInput,
    VoiceBookingParseOutput,
    VoiceBookingPipelineInput,
    VoiceBookingPipelineOutput,
    VoiceBookingSubmitInput,
    VoiceTranscribeOutput,
)

voice_router = APIRouter(prefix="/api/v2/voice", tags=["voice-booking"])


@voice_router.post("/booking/transcribe", response_model=VoiceTranscribeOutput)
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe audio with optional faster-whisper.

    If faster-whisper is not installed, returns actionable 501 message.
    """
    suffix = Path(file.filename or "audio.wav").suffix or ".wav"

    try:
        from faster_whisper import WhisperModel
    except Exception as exc:
        raise HTTPException(
            status_code=501,
            detail="STT engine chưa sẵn sàng. Cài faster-whisper để dùng transcribe endpoint.",
        ) from exc

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
        temp_file.write(await file.read())
        temp_path = temp_file.name

    try:
        model = WhisperModel(
            os.getenv("WHISPER_MODEL_SIZE", "small"),
            device=os.getenv("WHISPER_DEVICE", "cpu"),
            compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "int8"),
        )
        segments, _ = model.transcribe(temp_path, language="vi")
        transcript = " ".join(segment.text.strip() for segment in segments).strip()
        if not transcript:
            raise HTTPException(status_code=422, detail="Không nhận diện được nội dung giọng nói")
        return VoiceTranscribeOutput(transcript=transcript, engine="faster-whisper")
    finally:
        Path(temp_path).unlink(missing_ok=True)


@voice_router.post("/booking/parse-command", response_model=VoiceBookingParseOutput)
async def parse_voice_command(data: VoiceBookingParseInput):
    """Parse transcript into strict command schema.

    This router is intentionally isolated from legacy chat/admin flows.
    """
    return VoiceBookingParseOutput(**build_parse_result(data.transcript))


@voice_router.post("/booking/submit-validation")
async def submit_voice_booking(data: VoiceBookingSubmitInput):
    """Forward parsed voice command to Go validator endpoint."""
    url = data.backend_base_url.rstrip("/") + "/api/v1/ai/voice/booking/validate"
    headers = {
        "Authorization": f"Bearer {data.bearer_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "origin": data.command.origin,
        "destination": data.command.destination,
        "travelDate": data.command.travel_date,
        "seatCount": data.command.seat_count,
        "seatPreferenceOrder": data.command.seat_preference_order,
    }

    async with aiohttp.ClientSession() as session:
        async with session.post(url, headers=headers, json=payload) as resp:
            body_text = await resp.text()
            if resp.status >= 400:
                raise HTTPException(resp.status, f"Go validator call failed: {body_text}")
            try:
                return await resp.json()
            except Exception:
                return {"raw": body_text}


@voice_router.post("/booking/execute")
async def execute_voice_booking(data: VoiceBookingExecuteInput):
    """Execute full voice booking flow in Go backend.

    Go backend resolves user profile, route, trip, seat allocation and creates booking.
    """
    url = data.backend_base_url.rstrip("/") + "/api/v1/bookings/voice/execute"
    headers = {
        "Authorization": f"Bearer {data.bearer_token}",
        "Content-Type": "application/json",
    }
    payment_method = data.payment_method.strip() or "cod"

    payload = {
        "origin": data.command.origin,
        "destination": data.command.destination,
        "travelDate": data.command.travel_date,
        "seatCount": data.command.seat_count,
        "seatPreferenceOrder": data.command.seat_preference_order,
        "paymentMethod": payment_method,
    }

    async with aiohttp.ClientSession() as session:
        async with session.post(url, headers=headers, json=payload) as resp:
            body_text = await resp.text()
            if resp.status >= 400:
                raise HTTPException(resp.status, f"Go execute booking failed: {body_text}")
            try:
                return await resp.json()
            except Exception:
                return {"raw": body_text}


@voice_router.post("/booking/pipeline", response_model=VoiceBookingPipelineOutput)
async def run_pipeline(data: VoiceBookingPipelineInput):
    """Single endpoint: parse transcript, optionally submit to Go validator."""
    parse_output = VoiceBookingParseOutput(**build_parse_result(data.transcript))

    submit_result = None
    booking_result = None
    if (
        parse_output.command is not None
        and data.backend_base_url
        and data.bearer_token
    ):
        submit_input = VoiceBookingSubmitInput(
            backend_base_url=data.backend_base_url,
            bearer_token=data.bearer_token,
            command=parse_output.command,
        )
        submit_result = await submit_voice_booking(submit_input)

        if data.execute_booking:
            execute_input = VoiceBookingExecuteInput(
                backend_base_url=data.backend_base_url,
                bearer_token=data.bearer_token,
                command=parse_output.command,
                payment_method=data.payment_method,
            )
            booking_result = await execute_voice_booking(execute_input)

    return VoiceBookingPipelineOutput(parse=parse_output, submit=submit_result, booking=booking_result)
