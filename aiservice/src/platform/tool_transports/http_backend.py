"""Live booking transport — delegates to the Go backend via HTTP."""

from __future__ import annotations

from typing import Any

import httpx
import structlog

from src.platform.tool_transports.base import BookingTransport

logger = structlog.get_logger()


class HttpBackendTransport(BookingTransport):
    """Send booking request to the real Go backend over HTTP."""

    def __init__(self, base_url: str) -> None:
        self._base_url = base_url.rstrip("/")

    async def create_booking(self, payload: dict[str, Any]) -> dict[str, Any]:
        url = f"{self._base_url}/api/v1/bookings"
        logger.info("http_backend_transport.create_booking", url=url, payload_keys=list(payload.keys()))

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data: dict[str, Any] = resp.json()

        # Wrap with mode indicator
        return {
            "mode": "live",
            **data,
        }

    def mode(self) -> str:
        return "live"
