"""Dedicated gRPC voice booking service.

This service is intentionally separated from AIAgentService but can run on the same gRPC server/port.
"""

from __future__ import annotations

import base64
import importlib
import os
import tempfile
from typing import Any
from pathlib import Path

import grpc

from src.voice.parser import build_parse_result


class VoiceBookingServicer:
    async def ParseCommand(self, request: Any, context: Any) -> dict:
        transcript = ""
        if isinstance(request, dict):
            transcript = str(request.get("transcript", ""))
        else:
            transcript = str(getattr(request, "transcript", ""))
        return build_parse_result(transcript)

    async def HealthCheck(self, request: Any, context: Any) -> dict:
        return {
            "status": "healthy",
            "service": "voice-booking",
        }

    async def TranscribeAudio(self, request: Any, context: Any) -> dict:
        if isinstance(request, dict):
            filename = str(request.get("filename", "voice.webm"))
            content_type = str(request.get("content_type", "audio/webm"))
            audio_base64 = str(request.get("audio_base64", ""))
        else:
            filename = str(getattr(request, "filename", "voice.webm"))
            content_type = str(getattr(request, "content_type", "audio/webm"))
            audio_base64 = str(getattr(request, "audio_base64", ""))

        if not audio_base64.strip():
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details("empty audio payload")
            return {"transcript": "", "engine": ""}

        try:
            audio_bytes = base64.b64decode(audio_base64)
        except Exception:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details("invalid base64 audio")
            return {"transcript": "", "engine": ""}

        if len(audio_bytes) == 0:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details("empty audio payload")
            return {"transcript": "", "engine": ""}

        try:
            whisper_module = importlib.import_module("faster_whisper")
            whisper_model = whisper_module.WhisperModel
        except Exception:
            context.set_code(grpc.StatusCode.UNIMPLEMENTED)
            context.set_details("STT engine chưa sẵn sàng. Cài faster-whisper để dùng transcribe endpoint.")
            return {"transcript": "", "engine": ""}

        suffix = Path(filename).suffix or ".webm"

        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
            temp_file.write(audio_bytes)
            temp_path = temp_file.name

        try:
            model = whisper_model(
                os.getenv("WHISPER_MODEL_SIZE", "small"),
                device=os.getenv("WHISPER_DEVICE", "cpu"),
                compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "int8"),
            )
            segments, _ = model.transcribe(temp_path, language="vi")
            transcript = " ".join(segment.text.strip() for segment in segments).strip()
            if not transcript:
                context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
                context.set_details("Không nhận diện được nội dung giọng nói")
                return {"transcript": "", "engine": ""}
            return {
                "transcript": transcript,
                "engine": "faster-whisper",
            }
        finally:
            Path(temp_path).unlink(missing_ok=True)
