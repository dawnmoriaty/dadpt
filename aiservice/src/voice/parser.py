"""Voice booking parser.

Isolated parser for new voice flow, independent from legacy admin/chat router.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta

_ROUTE_PATTERNS = [
    re.compile(
        r"(?:^|\s)từ\s+(.+?)\s+(?:đến|tới)\s+(.+?)(?=\s+(?:ngày|vào|lúc|cho|hôm nay|ngày mai|mai|mốt|ngày kia|\d{1,2}/\d{1,2}/\d{4}|\d{4}-\d{2}-\d{2})\b|$)",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?:đi|đặt vé|book vé|mua vé)\s+từ\s+(.+?)\s+(?:đến|tới)\s+(.+?)(?=\s+(?:ngày|vào|lúc|cho|hôm nay|ngày mai|mai|mốt|ngày kia|\d{1,2}/\d{1,2}/\d{4}|\d{4}-\d{2}-\d{2})\b|$)",
        re.IGNORECASE,
    ),
]
_DATE_ISO_PATTERN = re.compile(r"\b(\d{4}-\d{2}-\d{2})\b")
_DATE_VN_PATTERN = re.compile(r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b")
_SEAT_COUNT_PATTERN = re.compile(r"\b(\d+)\s*(ghế|ve|vé|chỗ)\b", re.IGNORECASE)
_SEAT_COUNT_WORD_PATTERN = re.compile(r"\b(một|mot|hai|ba|bốn|bon|tư|tu)\s*(ghế|ve|vé|chỗ)\b", re.IGNORECASE)
_SEAT_CODE_PATTERN = re.compile(r"\b([A-Za-z]\d{1,2})\b")
_WORD_TO_NUMBER = {
    "một": 1,
    "mot": 1,
    "hai": 2,
    "ba": 3,
    "bốn": 4,
    "bon": 4,
    "tư": 4,
    "tu": 4,
}
_RELATIVE_DATES = {
    "hôm nay": 0,
    "ngày mai": 1,
    "mai": 1,
    "ngày kia": 2,
    "mốt": 2,
}


def build_parse_result(transcript: str) -> dict:
    text = " ".join(transcript.strip().split())

    origin = None
    destination = None
    for route_pattern in _ROUTE_PATTERNS:
        route_match = route_pattern.search(text)
        if route_match:
            origin = route_match.group(1).strip(" ,.")
            destination = route_match.group(2).strip(" ,.")
            break

    travel_date = _extract_date(text)

    seat_count = 1
    seat_match = _SEAT_COUNT_PATTERN.search(text)
    if seat_match:
        try:
            seat_count = max(1, int(seat_match.group(1)))
        except ValueError:
            seat_count = 1
    else:
        seat_word_match = _SEAT_COUNT_WORD_PATTERN.search(text)
        if seat_word_match:
            seat_count = _WORD_TO_NUMBER.get(seat_word_match.group(1).lower(), 1)

    seats = [s.upper() for s in _SEAT_CODE_PATTERN.findall(text)]
    dedup_seats = []
    seen = set()
    for seat in seats:
        if seat in seen:
            continue
        seen.add(seat)
        dedup_seats.append(seat)

    missing = []
    if not origin:
        missing.append("origin")
    if not destination:
        missing.append("destination")
    if not travel_date:
        missing.append("travel_date")

    confidence = 0.35
    if origin:
        confidence += 0.2
    if destination:
        confidence += 0.2
    if travel_date:
        confidence += 0.2
    confidence += 0.05
    if dedup_seats:
        confidence += 0.05
    confidence = min(0.95, round(confidence, 2))

    if missing:
        return {
            "command": None,
            "confidence": confidence,
            "missing_fields": missing,
            "message": "Transcript thiếu thông tin cần thiết, cần hỏi lại người dùng.",
        }

    return {
        "command": {
            "origin": origin,
            "destination": destination,
            "travel_date": travel_date,
            "seat_count": seat_count,
            "seat_preference_order": dedup_seats,
        },
        "confidence": confidence,
        "missing_fields": [],
        "message": "Đã parse command thành công.",
    }


def _extract_date(text: str) -> str | None:
    lowered = text.lower()
    for phrase, offset in _RELATIVE_DATES.items():
        if phrase in lowered:
            return (datetime.now() + timedelta(days=offset)).strftime("%Y-%m-%d")

    iso_match = _DATE_ISO_PATTERN.search(text)
    if iso_match:
        value = iso_match.group(1)
        if _is_valid_iso_date(value):
            return value

    vn_match = _DATE_VN_PATTERN.search(text)
    if vn_match:
        day, month, year = vn_match.groups()
        try:
            dt = datetime(int(year), int(month), int(day))
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            return None

    return None


def _is_valid_iso_date(value: str) -> bool:
    try:
        datetime.strptime(value, "%Y-%m-%d")
        return True
    except ValueError:
        return False
