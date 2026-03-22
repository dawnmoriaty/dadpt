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


def test_build_parse_result_supports_ben_xe_and_text_date(monkeypatch) -> None:
    class FixedDatetime(datetime):
        @classmethod
        def now(cls, tz=None):
            return cls(2026, 3, 20)

    monkeypatch.setattr(parser, "datetime", FixedDatetime)

    result = parser.build_parse_result(
        "Đặt chuyến xe từ bên xe Gia Lâm về bên xe Yên Nghĩa ngày 26 tháng 3 một ghế ngồi"
    )

    assert result["command"] is not None
    assert result["command"]["origin"] == "bến xe Gia Lâm"
    assert result["command"]["destination"] == "bến xe Yên Nghĩa"
    assert result["command"]["travel_date"] == "2026-03-26"
    assert result["command"]["seat_count"] == 1


def test_build_parse_result_supports_ascii_tieng_viet_text_date(monkeypatch) -> None:
    class FixedDatetime(datetime):
        @classmethod
        def now(cls, tz=None):
            return cls(2026, 3, 20)

    monkeypatch.setattr(parser, "datetime", FixedDatetime)

    result = parser.build_parse_result(
        "Dat chuyen xe tu ben xe Gia Lam ve ben xe Yen Nghia ngay 26 thang 3 mot ghe"
    )

    assert result["command"] is not None
    assert result["command"]["origin"] == "ben xe Gia Lam"
    assert result["command"]["destination"] == "ben xe Yen Nghia"
    assert result["command"]["travel_date"] == "2026-03-26"
    assert result["command"]["seat_count"] == 1


def test_build_parse_result_keeps_command_when_missing_date() -> None:
    result = parser.build_parse_result("Dat chuyen xe tu ben xe Gia Lam ve ben xe Yen Nghia")

    assert result["command"] is not None
    assert result["command"]["origin"] == "ben xe Gia Lam"
    assert result["command"]["destination"] == "ben xe Yen Nghia"
    assert result["command"]["travel_date"] == ""
    assert result["command"]["seat_count"] == 1
    assert result["missing_fields"] == ["travel_date"]
