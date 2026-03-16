"""Dedicated gRPC voice booking service.

This service is intentionally separated from AIAgentService but can run on the same gRPC server/port.
"""

from __future__ import annotations

from typing import Any

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
