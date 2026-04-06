"""Abstract base for booking tool transports."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class BookingTransport(ABC):
    """Interface for booking operations (mock or live)."""

    @abstractmethod
    async def create_booking(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Create a booking (real or mock)."""
        ...

    @abstractmethod
    def mode(self) -> str:
        """Return the transport mode name: 'mock' or 'live'."""
        ...
