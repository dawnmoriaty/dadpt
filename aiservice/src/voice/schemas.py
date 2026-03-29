from __future__ import annotations

from pydantic import BaseModel, Field


class VoiceBookingCommand(BaseModel):
    origin: str
    destination: str
    travel_date: str
    seat_count: int = Field(default=1, ge=1, le=4)
    seat_preference_order: list[str] = []


class VoiceBookingParseInput(BaseModel):
    transcript: str


class VoiceBookingParseOutput(BaseModel):
    command: VoiceBookingCommand | None = None
    confidence: float
    missing_fields: list[str] = []
    message: str


class VoiceBookingSubmitInput(BaseModel):
    backend_base_url: str
    bearer_token: str
    command: VoiceBookingCommand


class VoiceBookingExecuteInput(BaseModel):
    backend_base_url: str
    bearer_token: str
    command: VoiceBookingCommand
    payment_method: str = "cod"


class VoiceBookingSubmitOutput(BaseModel):
    accepted: bool
    reason_code: str
    reason: str
    normalized_command: dict | None = None
    profile_source: str | None = None


class VoiceBookingPipelineInput(BaseModel):
    transcript: str
    backend_base_url: str | None = None
    bearer_token: str | None = None
    execute_booking: bool = True
    payment_method: str = "cod"


class VoiceBookingPipelineOutput(BaseModel):
    parse: VoiceBookingParseOutput
    submit: dict | None = None
    booking: dict | None = None


class VoiceTranscribeOutput(BaseModel):
    transcript: str
    engine: str
