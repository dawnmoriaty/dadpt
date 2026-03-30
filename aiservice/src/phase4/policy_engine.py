"""Phase 4 policy engine for dynamic trip recommendation scoring.

Rules are loaded from workflow node config and can be tuned per tenant/skill.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class PolicyWeights:
    price: float = 0.5
    departure: float = 0.3
    seats: float = 0.2


POLICY_PROFILES: dict[str, PolicyWeights] = {
    "budget": PolicyWeights(price=0.7, departure=0.2, seats=0.1),
    "balanced": PolicyWeights(price=0.5, departure=0.3, seats=0.2),
    "early_departure": PolicyWeights(price=0.3, departure=0.6, seats=0.1),
}


def resolve_policy_weights(config: dict[str, Any] | None) -> PolicyWeights:
    cfg = config or {}
    profile = str(cfg.get("profile", "")).strip().lower()
    if profile in POLICY_PROFILES:
        return POLICY_PROFILES[profile]

    return PolicyWeights(
        price=float(cfg.get("price_weight", 0.5)),
        departure=float(cfg.get("departure_weight", 0.3)),
        seats=float(cfg.get("seats_weight", 0.2)),
    )


def score_trip(
    trip: dict[str, Any],
    *,
    min_price: float,
    max_price: float,
    earliest_departure: int | None,
    latest_departure: int | None,
    max_seats: int,
    weights: PolicyWeights,
) -> float:
    price = _to_float(trip.get("finalPrice") or trip.get("final_price") or trip.get("basePrice") or trip.get("base_price"))
    dep = _departure_minutes(trip)
    seats = _to_int(trip.get("availableSeats") or trip.get("available_seats"))

    price_score = _normalize_low_is_better(price, min_price, max_price)
    departure_score = _normalize_low_is_better(float(dep) if dep is not None else float("inf"), float(earliest_departure or 0), float(latest_departure or 1))
    seat_score = _normalize_high_is_better(seats, 0, max(1, max_seats))

    return (
        weights.price * price_score
        + weights.departure * departure_score
        + weights.seats * seat_score
    )


def _normalize_low_is_better(value: float, min_val: float, max_val: float) -> float:
    if max_val <= min_val:
        return 1.0
    if value == float("inf"):
        return 0.0
    return max(0.0, min(1.0, 1.0 - ((value - min_val) / (max_val - min_val))))


def _normalize_high_is_better(value: float, min_val: float, max_val: float) -> float:
    if max_val <= min_val:
        return 1.0
    return max(0.0, min(1.0, (value - min_val) / (max_val - min_val)))


def _departure_minutes(trip: dict[str, Any]) -> int | None:
    raw = trip.get("departureTime") or trip.get("departure_time")
    if not isinstance(raw, str) or not raw:
        return None
    hhmm = raw[11:16] if "T" in raw and len(raw) >= 16 else raw[:5]
    if len(hhmm) != 5 or hhmm[2] != ":":
        return None
    try:
        return int(hhmm[:2]) * 60 + int(hhmm[3:5])
    except ValueError:
        return None


def _to_float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _to_int(value: Any) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0
