from datetime import datetime

from src.voice import parser


def test_build_parse_result_supports_toi_and_word_seat_count() -> None:
    result = parser.build_parse_result(
        "Dat cho toi hai ghe tu Sai Gon toi Nha Trang ngay 21/03/2026"
    )

    assert result["command"] is not None
    assert result["command"]["origin"] == "Sai Gon"
    assert result["command"]["destination"] == "Nha Trang"
    assert result["command"]["travel_date"] == "2026-03-21"
    assert result["command"]["seat_count"] == 2


def test_build_parse_result_supports_relative_date(monkeypatch) -> None:
    class FixedDatetime(datetime):
        @classmethod
        def now(cls, tz=None):
            return cls(2026, 3, 19)

    monkeypatch.setattr(parser, "datetime", FixedDatetime)

    result = parser.build_parse_result(
        "Dat ve tu Ha Noi den Da Nang ngay mai 1 ghe"
    )

    assert result["command"] is not None
    assert result["command"]["travel_date"] == "2026-03-20"
