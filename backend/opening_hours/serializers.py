from datetime import datetime, time

from django.utils import timezone
from rest_framework import serializers

from .constants import WEEKDAY_KEYS
from .models import OpeningHoursException, WeeklyOpeningHour


def _format_time(value):
    if value is None:
        return None
    return value.strftime("%H:%M")


def _parse_time(value):
    if not value:
        return None
    if isinstance(value, time):
        return value
    return datetime.strptime(value, "%H:%M").time()


class DayHoursSerializer(serializers.Serializer):
    closed = serializers.BooleanField()
    open = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    close = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    def validate(self, attrs):
        closed = attrs.get("closed", False)
        open_raw = attrs.get("open")
        close_raw = attrs.get("close")

        if closed:
            attrs["open"] = None
            attrs["close"] = None
            return attrs

        if not open_raw or not close_raw:
            raise serializers.ValidationError("Nyitás és zárás megadása kötelező, ha nem zárva.")

        open_time = _parse_time(open_raw)
        close_time = _parse_time(close_raw)
        if open_time >= close_time:
            raise serializers.ValidationError("A nyitásnak a zárás előtt kell lennie.")

        attrs["open"] = _format_time(open_time)
        attrs["close"] = _format_time(close_time)
        return attrs


class OpeningHoursExceptionSerializer(serializers.Serializer):
    date = serializers.DateField()
    label = serializers.CharField(required=False, allow_blank=True, default="")
    closed = serializers.BooleanField()
    open = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    close = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    def validate(self, attrs):
        closed = attrs.get("closed", True)
        open_raw = attrs.get("open")
        close_raw = attrs.get("close")

        if closed:
            attrs["open"] = None
            attrs["close"] = None
            return attrs

        if not open_raw or not close_raw:
            raise serializers.ValidationError("Nyitás és zárás megadása kötelező, ha nem zárva.")

        open_time = _parse_time(open_raw)
        close_time = _parse_time(close_raw)
        if open_time >= close_time:
            raise serializers.ValidationError("A nyitásnak a zárás előtt kell lennie.")

        attrs["open"] = _format_time(open_time)
        attrs["close"] = _format_time(close_time)
        return attrs


class OpeningHoursPayloadSerializer(serializers.Serializer):
    opening_hours = serializers.DictField(child=DayHoursSerializer())
    exceptions = OpeningHoursExceptionSerializer(many=True, required=False, default=list)

    def validate_opening_hours(self, value):
        missing = [day for day in WEEKDAY_KEYS if day not in value]
        if missing:
            raise serializers.ValidationError(f"Hiányzó napok: {', '.join(missing)}")
        return value

    def save(self):
        opening_hours = self.validated_data["opening_hours"]
        exceptions = self.validated_data.get("exceptions", [])

        for day, data in opening_hours.items():
            WeeklyOpeningHour.objects.update_or_create(
                day=day,
                defaults={
                    "closed": data["closed"],
                    "open_time": None if data["closed"] else _parse_time(data["open"]),
                    "close_time": None if data["closed"] else _parse_time(data["close"]),
                },
            )

        exception_dates = []
        for item in exceptions:
            exception_dates.append(item["date"])
            OpeningHoursException.objects.update_or_create(
                date=item["date"],
                defaults={
                    "label": item.get("label", ""),
                    "closed": item["closed"],
                    "open_time": None if item["closed"] else _parse_time(item["open"]),
                    "close_time": None if item["closed"] else _parse_time(item["close"]),
                },
            )

        OpeningHoursException.objects.exclude(date__in=exception_dates).delete()
        return build_opening_hours_payload()


def weekly_row_to_dict(row):
    return {
        "closed": row.closed,
        "open": _format_time(row.open_time),
        "close": _format_time(row.close_time),
    }


def exception_row_to_dict(row):
    return {
        "date": row.date.isoformat(),
        "label": row.label,
        "closed": row.closed,
        "open": _format_time(row.open_time),
        "close": _format_time(row.close_time),
    }


def build_opening_hours_payload():
    weekly = {
        row.day: weekly_row_to_dict(row)
        for row in WeeklyOpeningHour.objects.all()
    }
    exceptions = [
        exception_row_to_dict(row)
        for row in OpeningHoursException.objects.all()
    ]
    return {
        "opening_hours": weekly,
        "exceptions": exceptions,
    }
