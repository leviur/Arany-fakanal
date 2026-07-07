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

        # Mentés után revision++ → live-sync.js → OpeningHours.fetchOpeningHours()
        from sync.services import bump_revision

        bump_revision()
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


class SlaRulesPayloadSerializer(serializers.Serializer):
    """Dashboard SLA — rendelés státusz limitek (perc) + foglalás figyelmeztetések."""

    status_limits = serializers.DictField(child=serializers.IntegerField(min_value=1))
    booking_limits = serializers.DictField(child=serializers.IntegerField(min_value=1))

    def validate_status_limits(self, value):
        from .constants import ORDER_STATUS_LIMIT_KEYS

        missing = [key for key in ORDER_STATUS_LIMIT_KEYS if key not in value]
        if missing:
            raise serializers.ValidationError(f"Hiányzó rendelés státusz: {', '.join(missing)}")
        return value

    def validate_booking_limits(self, value):
        from .constants import BOOKING_LIMIT_KEYS

        missing = [key for key in BOOKING_LIMIT_KEYS if key not in value]
        if missing:
            raise serializers.ValidationError(f"Hiányzó foglalás mező: {', '.join(missing)}")
        return value

    def save(self):
        from .models import SlaSettings

        status_limits = self.validated_data["status_limits"]
        booking_limits = self.validated_data["booking_limits"]

        settings, _ = SlaSettings.objects.get_or_create(pk=1)
        settings.order_limit_new = status_limits["Új"]
        settings.order_limit_confirmed = status_limits["Elfogadva"]
        settings.order_limit_preparing = status_limits["Készül"]
        settings.order_limit_ready = status_limits["Kiszállítás alatt"]
        settings.booking_warn_new_minutes = booking_limits["warnNew"]
        settings.booking_problem_new_minutes = booking_limits["problemNew"]
        settings.booking_warn_confirmed_hours = booking_limits["warnConfirmed"]
        settings.save()

        # SLA mentés → revision++ → dashboard beállítások + rendelés színezés frissül ("valami megváltozott, érdemes újratölteni az adatokat”.)
        from sync.services import bump_revision

        bump_revision()
        return build_sla_rules_payload()


def build_sla_rules_payload():
    from .models import SlaSettings
    from .services import ensure_sla_settings

    ensure_sla_settings()
    settings = SlaSettings.objects.get(pk=1)
    return {
        "status_limits": {
            "Új": settings.order_limit_new,
            "Elfogadva": settings.order_limit_confirmed,
            "Készül": settings.order_limit_preparing,
            "Kiszállítás alatt": settings.order_limit_ready,
        },
        "booking_limits": {
            "warnNew": settings.booking_warn_new_minutes,
            "problemNew": settings.booking_problem_new_minutes,
            "warnConfirmed": settings.booking_warn_confirmed_hours,
        },
    }

