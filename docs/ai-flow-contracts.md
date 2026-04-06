# AI Flow — Behavior Contracts

> **Hard rule:** No changes in `moblie/` under any circumstance.

This document defines the exact JSON contracts that tools, chat responses, and UI actions
must conform to. All refactoring work must preserve these contracts.

---

## 1. `search_trips` Tool Output

Returned by the `search_trips` tool (via Go backend HTTP or gRPC).

```json
{
  "trips": [
    {
      "id": 123,
      "providerName": "Provider A",
      "originName": "Sai Gon",
      "destinationName": "Nha Trang",
      "departureTime": "2026-04-08T09:00:00+07:00",
      "arrivalTime": "2026-04-08T15:00:00+07:00",
      "finalPrice": 280000,
      "availableSeats": 12,
      "status": "scheduled"
    }
  ],
  "total": 1
}
```

### Field notes

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | int | ✅ | Unique trip ID |
| `providerName` | string | ✅ | Bus operator name |
| `originName` | string | ✅ | Departure location |
| `destinationName` | string | ✅ | Arrival location |
| `departureTime` | ISO 8601 | ✅ | With timezone offset |
| `arrivalTime` | ISO 8601 | ✅ | With timezone offset |
| `finalPrice` | float | ✅ | Price per seat in VND |
| `availableSeats` | int | ✅ | Remaining seats |
| `status` | string | ✅ | `scheduled`, `departed`, `cancelled` |

---

## 2. `create_booking` Tool Output — Mock Mode

Default mode (`BOOKING_CALL_MODE=mock`). No real booking is written to the database.

```json
{
  "mode": "mock",
  "booking": {
    "booking_code": "MOCK-20260406-0001",
    "trip_id": 123,
    "status": "mock_pending",
    "seat_codes": ["A01", "A02"],
    "payment_method": "cod"
  },
  "message": "Mock booking created successfully. No real booking was written."
}
```

### Field notes

| Field | Type | Description |
|---|---|---|
| `mode` | `"mock"` | Always `"mock"` in mock mode |
| `booking.booking_code` | string | Prefixed with `MOCK-` |
| `booking.trip_id` | int | The trip being "booked" |
| `booking.status` | `"mock_pending"` | Never a real status |
| `booking.seat_codes` | string[] | Requested seats |
| `booking.payment_method` | string | As provided by caller |
| `message` | string | Human-readable confirmation |

---

## 3. Chat Response — Assistant Payload

Returned by `/api/v1/chat` and the gRPC `Chat` method.

```json
{
  "message": "Booking mock created. Please confirm next action.",
  "status": "completed",
  "session_id": "bus::user123::sess-abc",
  "workflow_slug": "ticket_sales.book_ticket",
  "tool_calls": [],
  "ui_actions": [
    {
      "type": "booking_confirmation",
      "payload": {
        "mode": "mock",
        "booking_code": "MOCK-20260406-0001",
        "trip_id": 123,
        "status": "mock_pending",
        "seat_codes": ["A01", "A02"],
        "payment_method": "cod"
      }
    }
  ],
  "trace_id": "tr-...",
  "metrics": {}
}
```

### `ui_actions` types

| Type | Description |
|---|---|
| `trip_recommendations` | Trip cards for main results |
| `related_trip_recommendations` | Related/alternative trip cards |
| `quick_replies` | Guided prompts for missing info |
| `booking_confirmation` | Mock or live booking result |

---

## 4. Existing UI Action Types (preserved)

These existing contracts MUST NOT change:

- `trip_recommendations` → `TripRecommendationsAction` in `presentation.py`
- `related_trip_recommendations` → same model, different `type` field
- `quick_replies` → `QuickRepliesAction` in `presentation.py`
