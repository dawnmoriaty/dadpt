import pytest

from src.grpc_server.server import _VoiceGenericHandler
from src.grpc_server.voice_service import VoiceBookingServicer


class _DummyCallDetails:
    def __init__(self, method: str):
        self.method = method


@pytest.mark.asyncio
async def test_voice_generic_handler_routes_parse_command() -> None:
    handler = _VoiceGenericHandler(VoiceBookingServicer())
    call_details = _DummyCallDetails("/aiagent.VoiceBookingService/ParseCommand")

    rpc_handler = handler.service(call_details)
    assert rpc_handler is not None
    assert rpc_handler.unary_unary is not None

    response_bytes = await rpc_handler.unary_unary(
        b'{"transcript":"dat ve tu Ha Noi den Hue ngay 2026-03-20"}',
        None,
    )

    assert isinstance(response_bytes, bytes)
    assert b"confidence" in response_bytes


def test_voice_generic_handler_ignores_other_service() -> None:
    handler = _VoiceGenericHandler(VoiceBookingServicer())
    call_details = _DummyCallDetails("/aiagent.AIAgentService/Chat")

    rpc_handler = handler.service(call_details)
    assert rpc_handler is None
