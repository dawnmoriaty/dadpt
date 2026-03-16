from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.voice.router import voice_router


app = FastAPI()
app.include_router(voice_router)
client = TestClient(app)


def test_parse_endpoint() -> None:
    resp = client.post(
        "/api/v2/voice/booking/parse-command",
        json={"transcript": "đặt vé từ Hà Nội đến Huế ngày 2026-03-20 1 ghế A1"},
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["command"] is not None
    assert body["command"]["origin"] == "Hà Nội"
    assert body["command"]["destination"] == "Huế"


def test_pipeline_parse_only() -> None:
    resp = client.post(
        "/api/v2/voice/booking/pipeline",
        json={"transcript": "đặt vé từ Sài Gòn đến Nha Trang ngày 2026-03-21"},
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["parse"]["command"] is not None
    assert body["submit"] is None
    assert body["booking"] is None


def test_pipeline_submit_and_execute(monkeypatch) -> None:
    async def fake_submit(_data):
        return {"data": {"accepted": True, "reasonCode": "VOICE_BOOKING_ACCEPTED"}}

    async def fake_execute(_data):
        return {"data": {"flow": "voice-e2e", "bookingResult": {"orderCode": "123"}}}

    import src.voice.router as voice_router_module

    monkeypatch.setattr(voice_router_module, "submit_voice_booking", fake_submit)
    monkeypatch.setattr(voice_router_module, "execute_voice_booking", fake_execute)

    resp = client.post(
        "/api/v2/voice/booking/pipeline",
        json={
            "transcript": "đặt vé từ Sài Gòn đến Nha Trang ngày 2026-03-21",
            "backend_base_url": "http://localhost:8080",
            "bearer_token": "token",
        },
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["parse"]["command"] is not None
    assert body["submit"] is not None
    assert body["booking"] is not None
