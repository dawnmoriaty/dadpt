"""Mock booking transport — returns contract-compliant mock data without hitting backend."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from src.platform.tool_transports.base import BookingTransport


class MockBookingTransport(BookingTransport):
    """Return a safe mock booking payload matching the contract in docs/ai-flow-contracts.md."""

    _counter: int = 0

    async def create_booking(self, payload: dict[str, Any]) -> dict[str, Any]:
        MockBookingTransport._counter += 1
        timestamp = datetime.now(tz=timezone.utc).strftime("%Y%m%d")
        booking_code = f"MOCK-{timestamp}-{MockBookingTransport._counter:04d}"

        trip_id = payload.get("trip_id") or payload.get("tripId") or 0
        seat_codes = payload.get("seat_codes") or payload.get("seatCodes") or ["A01"]
        payment_method = payload.get("payment_method") or payload.get("paymentMethod") or "cod"

        return {
            "mode": "mock",
            "booking": {
                "booking_code": booking_code,
                "trip_id": trip_id,
                "status": "mock_pending",
                "seat_codes": seat_codes,
                "payment_method": payment_method,
            },
            "message": "Mock booking created successfully. No real booking was written.",
        }

    def mode(self) -> str:
        return "mock"
