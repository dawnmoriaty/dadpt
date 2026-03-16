import pytest

from src.grpc_server.voice_service import VoiceBookingServicer


@pytest.mark.asyncio
async def test_grpc_parse_command() -> None:
    svc = VoiceBookingServicer()
    result = await svc.ParseCommand(
        {"transcript": "đặt vé từ Hà Nội đến Huế ngày 2026-03-20 2 ghế A1 A2"},
        context=None,
    )

    assert result["command"] is not None
    assert result["command"]["origin"] == "Hà Nội"
    assert result["command"]["destination"] == "Huế"
