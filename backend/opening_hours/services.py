from datetime import datetime, time

from rest_framework import serializers

from .constants import WEEKDAY_KEYS
from .models import OpeningHoursException, WeeklyOpeningHour
from .serializers import _format_time, _parse_time


PYTHON_WEEKDAY_TO_KEY = {
    0: "monday",
    1: "tuesday",
    2: "wednesday",
    3: "thursday",
    4: "friday",
    5: "saturday",
    6: "sunday",
}


def ensure_default_weekly_hours():
    from .constants import DEFAULT_WEEKLY_HOURS

    if WeeklyOpeningHour.objects.exists():
        return

    for day in WEEKDAY_KEYS:
        defaults = DEFAULT_WEEKLY_HOURS[day]
        WeeklyOpeningHour.objects.create(
            day=day,
            closed=defaults["closed"],
            open_time=None if defaults["closed"] else _parse_time(defaults["open"]),
            close_time=None if defaults["closed"] else _parse_time(defaults["close"]),
        )


def get_day_hours_info(target_date):
    exception = OpeningHoursException.objects.filter(date=target_date).first()
    if exception:
        return {
            "closed": exception.closed,
            "open": _format_time(exception.open_time),
            "close": _format_time(exception.close_time),
            "label": exception.label,
            "is_exception": True,
        }

    day_key = PYTHON_WEEKDAY_TO_KEY[target_date.weekday()]
    weekly = WeeklyOpeningHour.objects.filter(day=day_key).first()
    if not weekly:
        return None

    return {
        "closed": weekly.closed,
        "open": _format_time(weekly.open_time),
        "close": _format_time(weekly.close_time),
        "label": "",
        "is_exception": False,
    }


def get_time_slots_for_date(target_date):
    day_info = get_day_hours_info(target_date)
    if not day_info or day_info["closed"] or not day_info["open"] or not day_info["close"]:
        return []

    open_time = _parse_time(day_info["open"])
    close_time = _parse_time(day_info["close"])
    start_min = open_time.hour * 60 + open_time.minute
    end_min = close_time.hour * 60 + close_time.minute

    slots = []
    for minute in range(start_min, end_min + 1, 30):
        slots.append(f"{minute // 60:02d}:{minute % 60:02d}")
    return slots


def validate_reservation_slot(reservation_date, reservation_time):
    if isinstance(reservation_time, str):
        reservation_time = _parse_time(reservation_time)

    day_info = get_day_hours_info(reservation_date)
    if not day_info or day_info["closed"]:
        raise serializers.ValidationError(
            {"date": "Ezen a napon zárva vagyunk, válassz másik dátumot!"}
        )

    if not day_info["open"] or not day_info["close"]:
        raise serializers.ValidationError(
            {"date": "Ezen a napon zárva vagyunk, válassz másik dátumot!"}
        )

    slots = get_time_slots_for_date(reservation_date)
    time_label = reservation_time.strftime("%H:%M")
    if time_label not in slots:
        raise serializers.ValidationError(
            {"time": "Válassz érvényes időpontot a nyitvatartás szerint!"}
        )

    return True


def ensure_sla_settings():
    """Egyetlen SLA sor létrehozása alapértelmezésekkel, ha még nincs."""
    from .models import SlaSettings

    SlaSettings.objects.get_or_create(pk=1)

