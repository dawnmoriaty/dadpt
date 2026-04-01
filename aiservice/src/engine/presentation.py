"""Presentation layer for chat responses and trip UI components."""

from __future__ import annotations

import ast
import json
import re
from typing import Literal

from pydantic import BaseModel, Field

from src.engine.workflow_context import WorkflowContext


class SearchMeta(BaseModel):
    origin: str = ""
    destination: str = ""
    date: str = ""
    time: str = ""
    passengers: int = 1
    budget: float = 0.0


class ScoreExplain(BaseModel):
    reasons: list[str] = Field(default_factory=list)
    price: float = 0.0
    available_seats: int = 0


class BookTicketValue(BaseModel):
    trip_id: int
    passengers: int
    payment_method: str = "cod"


class PrefillMessageValue(BaseModel):
    message: str


class OpenSearchValue(BaseModel):
    origin: str = ""
    destination: str = ""
    date: str = ""
    passengers: int = 1


ButtonValue = str | BookTicketValue | PrefillMessageValue | OpenSearchValue


class ActionButton(BaseModel):
    label: str
    action: str
    value: ButtonValue


class QuickReply(BaseModel):
    label: str
    value: str


class TripCard(BaseModel):
    trip_id: int
    provider_name: str = ""
    origin_name: str = ""
    destination_name: str = ""
    departure_time: str = ""
    arrival_time: str = ""
    price: float = 0.0
    available_seats: int = 0
    status: str = ""
    image_url: str = ""
    description: str = ""
    tags: list[str] = Field(default_factory=list)
    score_explain: ScoreExplain = Field(default_factory=ScoreExplain)
    buttons: list[ActionButton] = Field(default_factory=list)


class TripRecommendationsAction(BaseModel):
    type: Literal["trip_recommendations", "related_trip_recommendations"]
    title: str
    items: list[TripCard]
    options: list[QuickReply] = Field(default_factory=list)
    prompt: str = ""
    meta: SearchMeta = Field(default_factory=SearchMeta)


class QuickRepliesAction(BaseModel):
    type: Literal["quick_replies"]
    prompt: str
    options: list[QuickReply]
    meta: SearchMeta = Field(default_factory=SearchMeta)


UIAction = TripRecommendationsAction | QuickRepliesAction


class ToolCallLog(BaseModel):
    tool_name: str
    inputs: str
    output: str
    timestamp: str


class ChatResponsePayload(BaseModel):
    message: str
    status: str
    session_id: str
    workflow_slug: str = ""
    tool_calls: list[ToolCallLog] = Field(default_factory=list)
    ui_actions: list[dict[str, object]] = Field(default_factory=list)
    trace_id: str = ""
    metrics: dict[str, object] = Field(default_factory=dict)


class ResponseFormatter:
    def format(self, ctx: WorkflowContext, session_id: str, metrics: dict[str, object]) -> dict[str, object]:
        tool_calls = self._build_tool_calls(ctx)
        typed_actions = self._build_ui_actions(ctx)
        ui_actions = [action.model_dump(mode="json") for action in typed_actions]

        custom_actions = ctx.get_var("ui_actions")
        if isinstance(custom_actions, list) and custom_actions:
            ui_actions.extend(custom_actions)

        payload = ChatResponsePayload(
            message=self._humanize_response(ctx, typed_actions),
            status=ctx.status,
            session_id=session_id,
            workflow_slug=ctx.workflow_slug or "",
            tool_calls=tool_calls,
            ui_actions=ui_actions,
            trace_id=ctx.trace_id,
            metrics=metrics,
        )
        return payload.model_dump(mode="json")

    def _build_tool_calls(self, ctx: WorkflowContext) -> list[ToolCallLog]:
        calls: list[ToolCallLog] = []
        for tool_call in ctx.tool_calls_log:
            calls.append(
                ToolCallLog(
                    tool_name=str(tool_call.get("tool", "") or ""),
                    inputs=json.dumps(tool_call.get("inputs", {}), ensure_ascii=False),
                    output=str(tool_call.get("output", "") or "")[:500],
                    timestamp=str(tool_call.get("timestamp", "") or ""),
                )
            )
        return calls

    def _build_ui_actions(self, ctx: WorkflowContext) -> list[UIAction]:
        trips = self._extract_trip_items(ctx)
        if not trips:
            return self._build_guided_actions(ctx)

        meta = self._extract_search_meta(ctx)
        mapped_items = [self._map_trip_card(item, meta) for item in trips]
        items: list[TripCard] = [item for item in mapped_items if item is not None]
        if not items:
            return self._build_guided_actions(ctx)

        tags_by_trip = self._build_trip_tags(items)
        explain_by_trip = self._build_score_explain(items)
        for item in items:
            item.tags = tags_by_trip.get(item.trip_id, [])
            item.score_explain = explain_by_trip.get(item.trip_id, ScoreExplain())

        actions: list[UIAction] = [
            TripRecommendationsAction(
                type="trip_recommendations",
                title="Chuyến xe gợi ý cho bạn",
                items=items,
                options=self._build_trip_quick_replies(meta, items),
                prompt="Chọn chuyến phù hợp: bấm Xem chi tiết hoặc Đặt vé luôn.",
                meta=meta,
            )
        ]

        related_items = self._extract_related_items(ctx, meta)
        if related_items:
            related_tags = self._build_trip_tags(related_items)
            related_explain = self._build_score_explain(related_items)
            for item in related_items:
                item.tags = related_tags.get(item.trip_id, [])
                item.score_explain = related_explain.get(item.trip_id, ScoreExplain())

            actions.append(
                TripRecommendationsAction(
                    type="related_trip_recommendations",
                    title="Chuyến liên quan bạn có thể quan tâm",
                    items=related_items,
                    options=[
                        QuickReply(label="Ưu tiên giá rẻ hơn", value="Ưu tiên giá rẻ hơn"),
                        QuickReply(label="Ưu tiên giờ đi sớm hơn", value="Ưu tiên giờ đi sớm hơn"),
                    ],
                    prompt="Bạn muốn xem thêm lựa chọn rẻ hơn hay đi sớm hơn?",
                    meta=meta,
                )
            )

        return actions

    def _build_guided_actions(self, ctx: WorkflowContext) -> list[UIAction]:
        meta = self._extract_search_meta(ctx)
        if not self._has_search_meta(meta):
            meta = self._extract_meta_from_message(ctx.user_message)

        prompt, options = self._build_missing_info_prompt(meta)
        deduped = self._dedupe_quick_replies(options)
        return [
            QuickRepliesAction(
                type="quick_replies",
                prompt=prompt,
                options=deduped,
                meta=meta,
            )
        ]

    @staticmethod
    def _has_search_meta(meta: SearchMeta) -> bool:
        return bool(
            meta.origin.strip()
            or meta.destination.strip()
            or meta.date.strip()
            or meta.time.strip()
            or meta.passengers > 1
            or meta.budget > 0
        )

    def _humanize_response(self, ctx: WorkflowContext, ui_actions: list[UIAction]) -> str:
        text = str(ctx.response or "").strip()
        has_trip_cards = any(
            isinstance(action, TripRecommendationsAction) and action.items for action in ui_actions
        )

        technical_markers = [
            "unresolved placeholders",
            "cannot connect",
            "grpc call",
            "failed:",
            "traceback",
            "connection refused",
        ]
        if text and any(marker in text.lower() for marker in technical_markers):
            meta = self._extract_search_meta(ctx)
            if meta.origin and meta.destination:
                return f"Mình chưa lấy được dữ liệu chuyến {meta.origin} → {meta.destination} ngay lúc này. Bạn thử lại giúp mình nhé."
            return "Hệ thống đang bận một chút. Bạn thử nhập lại điểm đi, điểm đến và ngày đi nhé."

        if has_trip_cards:
            meta = self._extract_search_meta(ctx)
            if meta.time:
                return f"Mình tìm thấy vài chuyến phù hợp gần khung giờ {meta.time}. Bạn xem bên dưới nhé."
            return "Mình tìm thấy vài chuyến phù hợp. Bạn xem bên dưới nhé."

        if text:
            return text

        if ctx.status == "paused":
            return "Mình cần thêm thông tin để tìm chuyến cho bạn."

        return "Mình có thể giúp bạn tìm chuyến xe phù hợp."

    def _extract_search_meta(self, ctx: WorkflowContext) -> SearchMeta:
        message_meta = self._extract_meta_from_message(ctx.user_message)

        origin = self._clean_location(str(ctx.get_var("origin", "") or ""))
        destination = self._clean_location(str(ctx.get_var("destination", "") or ""))
        date = str(ctx.get_var("date", "") or "").strip()
        time = str(ctx.get_var("time", "") or ctx.get_var("departure_time", "") or "").strip()
        passengers = self._to_int(ctx.get_var("passengers"))
        budget = self._to_float(
            ctx.get_var("budget")
            or ctx.get_var("max_price")
            or ctx.get_var("maxPrice")
            or ctx.get_var("price")
        )

        if not origin:
            origin = message_meta.origin
        if not destination:
            destination = message_meta.destination
        if not date:
            date = message_meta.date
        if not time:
            time = message_meta.time
        if passengers <= 0:
            passengers = message_meta.passengers
        if budget <= 0:
            budget = message_meta.budget

        if origin or destination or date or time or passengers > 0 or budget > 0:
            return SearchMeta(
                origin=origin,
                destination=destination,
                date=date,
                time=time,
                passengers=max(1, passengers) if passengers > 0 else 1,
                budget=budget if budget > 0 else 0.0,
            )

        search_call = None
        for tool_call in reversed(ctx.tool_calls_log):
            if tool_call.get("tool") == "search_trips":
                search_call = tool_call
                break

        if not search_call:
            return SearchMeta()

        inputs = search_call.get("inputs", {})
        if not isinstance(inputs, dict):
            return SearchMeta()

        passengers = self._to_int(inputs.get("passengers"))
        time = str(inputs.get("time", "") or inputs.get("departure_time", "") or "")
        budget = self._to_float(inputs.get("budget") or inputs.get("max_price") or inputs.get("maxPrice") or inputs.get("price"))
        parsed_tool_meta = SearchMeta(
            origin=self._clean_location(str(inputs.get("origin", "") or "")),
            destination=self._clean_location(str(inputs.get("destination", "") or "")),
            date=str(inputs.get("date", "") or ""),
            time=time,
            passengers=max(1, passengers) if passengers > 0 else 1,
            budget=budget if budget > 0 else 0.0,
        )

        if not parsed_tool_meta.origin:
            parsed_tool_meta.origin = message_meta.origin
        if not parsed_tool_meta.destination:
            parsed_tool_meta.destination = message_meta.destination
        if not parsed_tool_meta.date:
            parsed_tool_meta.date = message_meta.date
        if not parsed_tool_meta.time:
            parsed_tool_meta.time = message_meta.time
        if parsed_tool_meta.passengers <= 0:
            parsed_tool_meta.passengers = max(1, message_meta.passengers)
        if parsed_tool_meta.budget <= 0:
            parsed_tool_meta.budget = message_meta.budget

        return parsed_tool_meta

    def _extract_trip_items(self, ctx: WorkflowContext) -> list[dict[str, object]]:
        for key in ("top_trips", "search_results", "search_results_raw", "trips"):
            items = self._trip_list_from_value(ctx.get_var(key))
            if items:
                return items[:5]

        for tool_call in reversed(ctx.tool_calls_log):
            if tool_call.get("tool") != "search_trips":
                continue
            items = self._trip_list_from_value(tool_call.get("output"))
            if items:
                return items[:5]

        return []

    def _extract_related_items(self, ctx: WorkflowContext, meta: SearchMeta) -> list[TripCard]:
        trips = self._trip_list_from_value(ctx.get_var("related_trips"))
        mapped_items = [self._map_trip_card(item, meta) for item in trips]
        items: list[TripCard] = [item for item in mapped_items if item is not None]
        return items[:3]

    def _trip_list_from_value(self, raw_value: object) -> list[dict[str, object]]:
        if raw_value is None:
            return []
        if isinstance(raw_value, str):
            value = raw_value.strip()
            if not value:
                return []
            try:
                raw_value = json.loads(value)
            except json.JSONDecodeError:
                try:
                    raw_value = ast.literal_eval(value)
                except (ValueError, SyntaxError):
                    return []

        if isinstance(raw_value, list):
            return [item for item in raw_value if isinstance(item, dict)]
        if not isinstance(raw_value, dict):
            return []

        for key in ("trips", "items", "results", "data"):
            nested = raw_value.get(key)
            if isinstance(nested, list):
                return [item for item in nested if isinstance(item, dict)]
            if isinstance(nested, dict):
                items = self._trip_list_from_value(nested)
                if items:
                    return items

        return []

    def _map_trip_card(self, raw_trip: dict[str, object], meta: SearchMeta) -> TripCard | None:
        trip_id = self._to_int(raw_trip.get("id"))
        if trip_id <= 0:
            return None

        passengers = max(1, self._to_int(meta.passengers) or 1)
        detail_url = f"/trips/{trip_id}?passengers={passengers}"
        price = self._to_float(
            self._first_value(raw_trip, "final_price", "finalPrice", "base_price", "basePrice")
        )
        description = self._first_str(raw_trip, "description", "busTypeName", "bus_type_name")

        return TripCard(
            trip_id=trip_id,
            provider_name=self._first_str(raw_trip, "provider_name", "providerName"),
            origin_name=self._first_str(raw_trip, "origin_name", "originName", "origin_city", "originCity"),
            destination_name=self._first_str(
                raw_trip,
                "destination_name",
                "destinationName",
                "destination_city",
                "destinationCity",
            ),
            departure_time=self._first_str(raw_trip, "departure_time", "departureTime"),
            arrival_time=self._first_str(raw_trip, "arrival_time", "arrivalTime"),
            price=price,
            available_seats=self._to_int(self._first_value(raw_trip, "available_seats", "availableSeats")),
            status=self._first_str(raw_trip, "status"),
            image_url=self._first_str(raw_trip, "image_url", "imageUrl", "busImageUrl", "bus_image_url"),
            description=description,
            buttons=[
                ActionButton(label="Xem chi tiết", action="open_url", value=detail_url),
                ActionButton(
                    label="Đặt vé luôn",
                    action="book_ticket",
                    value=BookTicketValue(
                        trip_id=trip_id,
                        passengers=passengers,
                        payment_method="cod",
                    ),
                ),
            ],
        )

    def _build_trip_tags(self, items: list[TripCard]) -> dict[int, list[str]]:
        prices = [item.price for item in items if item.price > 0]
        min_price = min(prices) if prices else None
        departures = [item.departure_time for item in items if item.departure_time]
        earliest_departure = min(departures) if departures else ""

        tags: dict[int, list[str]] = {}
        for item in items:
            item_tags: list[str] = []
            if min_price is not None and item.price > 0 and abs(item.price - min_price) < 0.01:
                item_tags.append("best_price")
            if earliest_departure and item.departure_time == earliest_departure:
                item_tags.append("faster")
            if item.price >= 300000:
                item_tags.append("premium")
            if item_tags:
                tags[item.trip_id] = item_tags
        return tags

    def _build_score_explain(self, items: list[TripCard]) -> dict[int, ScoreExplain]:
        prices = [item.price for item in items if item.price > 0]
        min_price = min(prices) if prices else None
        departures = [item.departure_time for item in items if item.departure_time]
        earliest_departure = min(departures) if departures else ""

        explain: dict[int, ScoreExplain] = {}
        for item in items:
            reasons: list[str] = []
            if min_price is not None and item.price > 0 and abs(item.price - min_price) < 0.01:
                reasons.append("Gia thap nhat")
            if earliest_departure and item.departure_time == earliest_departure:
                reasons.append("Khoi hanh som")
            if item.available_seats >= 25:
                reasons.append("Con nhieu ghe")
            explain[item.trip_id] = ScoreExplain(
                reasons=reasons,
                price=item.price,
                available_seats=item.available_seats,
            )
        return explain

    def _build_trip_quick_replies(self, meta: SearchMeta, items: list[TripCard]) -> list[QuickReply]:
        replies: list[QuickReply] = [
            QuickReply(label="Đặt vé chuyến rẻ nhất", value="Đặt vé chuyến rẻ nhất"),
            QuickReply(label="Đặt vé chuyến đi sớm nhất", value="Đặt vé chuyến đi sớm nhất"),
        ]

        if items and items[0].provider_name:
            replies.insert(1, QuickReply(label=f"Đặt vé {items[0].provider_name}", value=f"Đặt vé {items[0].provider_name}"))

        if meta.origin and meta.destination:
            if meta.passengers <= 1:
                replies.append(
                    QuickReply(
                        label=f"Tìm lại {meta.origin} → {meta.destination} cho 2 người",
                        value=f"Tìm lại {meta.origin} → {meta.destination} cho 2 người",
                    )
                )
            replies.append(
                QuickReply(
                    label=f"Tìm {meta.origin} → {meta.destination} ngày khác",
                    value=f"Tìm {meta.origin} → {meta.destination} ngày khác",
                )
            )

        return replies[:5]

    def _build_missing_info_prompt(self, meta: SearchMeta) -> tuple[str, list[str]]:
        origin = meta.origin.strip()
        destination = meta.destination.strip()
        date = meta.date.strip()
        time = meta.time.strip()
        passengers = meta.passengers
        budget = meta.budget

        if not origin:
            return (
                "Bạn muốn xuất phát từ đâu?",
                ["Xuất phát từ Sài Gòn", "Xuất phát từ Hà Nội", "Xuất phát từ Đà Nẵng"],
            )

        if not destination:
            return (
                f"Bạn muốn đi từ {origin} đến đâu?",
                [f"{origin} đi Nha Trang", f"{origin} đi Đà Lạt", f"{origin} đi Đà Nẵng"],
            )

        if not date:
            return (
                f"Bạn muốn đi tuyến {origin} -> {destination} vào ngày nào?",
                ["Đi hôm nay", "Đi ngày mai", "Đi ngày kia"],
            )

        if not time:
            return (
                f"Bạn muốn khởi hành khoảng mấy giờ cho tuyến {origin} -> {destination}?",
                ["Khoảng 07:00", "Khoảng 09:00", "Khoảng 21:00"],
            )

        if budget <= 0:
            return (
                "Bạn muốn mức giá khoảng bao nhiêu mỗi vé?",
                ["Dưới 250000", "Khoảng 300000", "Dưới 500000"],
            )

        pax_text = f" cho {passengers} người" if passengers > 1 else ""
        budget_text = f" ngân sách {int(budget)}" if budget > 0 else ""
        return (
            f"Tìm chuyến {origin} -> {destination}{pax_text} ngày {date} lúc {time}{budget_text}, đúng không?",
            [
                f"Tìm chuyến {origin} -> {destination} ngày {date} lúc {time}{budget_text}",
                "Ưu tiên chuyến rẻ nhất",
                "Ưu tiên chuyến đi sớm nhất",
            ],
        )

    def _extract_meta_from_message(self, message: str) -> SearchMeta:
        text = (message or "").strip()
        lowered = text.lower()
        meta = SearchMeta()

        route_match = re.search(
            r"(?:t[uừ]|xu[ấa]t\s+ph[aá]t\s+t[uừ])\s+(.+?)\s+(?:[đd][ếe]n|t[ớo]i|v[eề])\s+(.+?)(?=\s+(?:ng[àa]y|l[úu]c|luc|gi[ờo]|ng[aâ]n\s+s[aá]ch|gi[aá]|cho\s+\d+\s+(?:ng[ườu]i|ve|v[eé]))|[,.!?]|$)",
            text,
            flags=re.IGNORECASE,
        )
        if not route_match:
            route_match = re.search(
                r"(?:đi|di)\s+(.+?)\s+(?:[đd][ếe]n|t[ớo]i|v[eề])\s+(.+?)(?=\s+(?:ng[àa]y|l[úu]c|luc|gi[ờo]|ng[aâ]n\s+s[aá]ch|gi[aá]|cho\s+\d+\s+(?:ng[ườu]i|ve|v[eé]))|[,.!?]|$)",
                text,
                flags=re.IGNORECASE,
            )
        if route_match:
            meta.origin = self._clean_location(route_match.group(1))
            meta.destination = self._clean_location(route_match.group(2))

        iso_date = re.search(r"\d{4}-\d{2}-\d{2}", text)
        if iso_date:
            meta.date = iso_date.group(0)
        elif "ngày mai" in lowered or "ngay mai" in lowered:
            meta.date = "ngày mai"

        meta.time = self._extract_time_from_message(text)
        meta.budget = self._extract_budget_from_message(text)

        pax_match = re.search(r"(\d+)\s*(ng[ườu]i|ve|vé)", lowered)
        if pax_match:
            meta.passengers = max(1, self._to_int(pax_match.group(1)))

        return meta

    @staticmethod
    def _extract_budget_from_message(text: str) -> float:
        lowered = text.lower()

        budget_phrase = re.search(r"ng[aâ]n\s+s[aá]ch\s*(\d{2,4})\s*k", lowered)
        if budget_phrase:
            return float(int(budget_phrase.group(1)) * 1000)

        budget_plain = re.search(r"ng[aâ]n\s+s[aá]ch\s*(\d{5,7})", lowered)
        if budget_plain:
            return float(int(budget_plain.group(1)))

        compact_k = re.search(r"(?:dưới|toi da|tối đa|khoảng|tam)\s*(\d{2,4})\s*k", lowered)
        if compact_k:
            return float(int(compact_k.group(1)) * 1000)

        plain = re.search(r"(?:dưới|toi da|tối đa|khoảng|tam)\s*(\d{5,7})", lowered)
        if plain:
            return float(int(plain.group(1)))

        ticket_based = re.search(r"(\d{2,4})\s*k\s*(?:/ve|moi ve|mỗi vé|ve)", lowered)
        if ticket_based:
            return float(int(ticket_based.group(1)) * 1000)

        return 0.0

    @staticmethod
    def _clean_location(value: str) -> str:
        text = " ".join(str(value or "").strip().split())
        if not text:
            return ""

        lowered = text.lower()
        banned_prefixes = (
            "tôi muốn",
            "toi muon",
            "mình muốn",
            "minh muon",
            "cho tôi",
            "cho toi",
            "đi ",
            "di ",
            "từ ",
            "tu ",
        )
        for prefix in banned_prefixes:
            if lowered.startswith(prefix):
                text = text[len(prefix):].strip()
                lowered = text.lower()

        trailing_noise = (
            "ngày",
            "ngay",
            "lúc",
            "luc",
            "giờ",
            "gio",
            "ngân sách",
            "ngan sach",
            "giá",
            "gia",
            "cho",
        )
        for marker in trailing_noise:
            idx = lowered.find(f" {marker} ")
            if idx > 0:
                text = text[:idx].strip(" ,.")
                break

        if len(text) < 2:
            return ""
        return text.strip(" ,.")

    @staticmethod
    def _extract_time_from_message(text: str) -> str:
        hhmm = re.search(r"\b([01]?\d|2[0-3])[:h]([0-5]?\d)\b", text, flags=re.IGNORECASE)
        if hhmm:
            hour = int(hhmm.group(1))
            minute = int(hhmm.group(2))
            if 0 <= hour <= 23 and 0 <= minute <= 59:
                return f"{hour:02d}:{minute:02d}"

        hour_only = re.search(r"(?:l[úu]c\s*)?([01]?\d|2[0-3])\s*(?:h|giờ|gio)\b", text, flags=re.IGNORECASE)
        if not hour_only:
            return ""

        hour = int(hour_only.group(1))
        lowered = text.lower()

        has_evening_hint = (
            bool(re.search(r"\bchiều\b", lowered))
            or bool(re.search(r"\bchieu\b", lowered))
            or bool(re.search(r"\btối\b", lowered))
            or bool(re.search(r"\btoi\s+nay\b", lowered))
            or bool(re.search(r"\bbuổi\s+tối\b", lowered))
            or bool(re.search(r"\bbuoi\s+toi\b", lowered))
            or bool(re.search(r"\bpm\b", lowered))
        )

        if 1 <= hour < 12 and has_evening_hint:
            hour += 12
        if hour == 12 and any(word in lowered for word in ("sáng", "sang", "am")):
            hour = 0

        if 0 <= hour <= 23:
            return f"{hour:02d}:00"
        return ""

    @staticmethod
    def _dedupe_quick_replies(options: list[str]) -> list[QuickReply]:
        replies: list[QuickReply] = []
        seen: set[str] = set()
        for option in options:
            normalized = option.strip().lower()
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            replies.append(QuickReply(label=option, value=option))
        return replies[:6]

    @staticmethod
    def _first_value(data: dict[str, object], *keys: str) -> object:
        for key in keys:
            if key in data and data[key] is not None:
                return data[key]
        return None

    def _first_str(self, data: dict[str, object], *keys: str) -> str:
        value = self._first_value(data, *keys)
        return "" if value is None else str(value)

    @staticmethod
    def _to_int(value: object) -> int:
        if value is None:
            return 0
        if isinstance(value, bool):
            return int(value)
        if not isinstance(value, (int, float, str, bytes, bytearray)):
            return 0
        try:
            return int(value)
        except (TypeError, ValueError):
            return 0

    @staticmethod
    def _to_float(value: object) -> float:
        if value is None:
            return 0.0
        if isinstance(value, bool):
            return float(value)
        if not isinstance(value, (int, float, str, bytes, bytearray)):
            return 0.0
        try:
            return float(value)
        except (TypeError, ValueError):
            return 0.0
