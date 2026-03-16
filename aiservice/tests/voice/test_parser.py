from src.voice.parser import build_parse_result


def test_parse_success_minimal_fields() -> None:
    result = build_parse_result("đặt vé từ Hà Nội đến Đà Nẵng ngày 2026-03-20 2 ghế A1 A2")

    assert result["command"] is not None
    assert result["command"]["origin"] == "Hà Nội"
    assert result["command"]["destination"] == "Đà Nẵng"
    assert result["command"]["travel_date"] == "2026-03-20"
    assert result["command"]["seat_count"] == 2
    assert result["command"]["seat_preference_order"] == ["A1", "A2"]


def test_parse_missing_required_fields() -> None:
    result = build_parse_result("cho tôi đặt vé ngày 2026-03-20")

    assert result["command"] is None
    assert "origin" in result["missing_fields"]
    assert "destination" in result["missing_fields"]
