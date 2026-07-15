# Nyitvatartás + SLA — JSON ↔ adatbázis.
#
# GET: build_*_payload() összerakja a választ az DB-ből
# PUT: *PayloadSerializer.save() ellenőrzi az űrlapot, ment, bump_revision()
#
# Front: opening-hours.js (nyitvatartás), settings.js + sla-rules.js (SLA)
# Logika olvasáshoz: services.py (pl. foglalás slot ellenőrzés)

from datetime import datetime, time

from rest_framework import serializers

from .constants import WEEKDAY_KEYS
from .models import OpeningHoursException, WeeklyOpeningHour


def _format_time(value):
    # DB time mező → "11:00" string (API / front formátum)
    if value is None:
        return None
    return value.strftime("%H:%M")


def _parse_time(value):
    # "11:00" string → time objektum mentéshez. services.py is ezt használja.
    if not value:
        return None
    if isinstance(value, time):
        return value
    return datetime.strptime(value, "%H:%M").time()


class DayHoursSerializer(serializers.Serializer):
    # Egy nap nyitvatartása — heti sablon egy sora (pl. monday: zárva / 11:00–22:00)

    closed = serializers.BooleanField()
    open = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    close = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    def validate(self, attrs):
        closed = attrs.get("closed", False)
        open_raw = attrs.get("open")
        close_raw = attrs.get("close")

        if closed:
            # Zárva nap — open/close nem kell
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
    # Kivétel nap — konkrét dátum (pl. dec. 24. zárva, vagy rövidebb nyitvatartás)

    date = serializers.DateField()
    label = serializers.CharField(required=False, allow_blank=True, default="")
    closed = serializers.BooleanField()
    open = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    close = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    def validate(self, attrs):
        # Ugyanaz a szabály, mint DayHoursSerializer — zárva vagy open < close
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
    # PUT /api/opening-hours/ teljes body — dashboard Beállítások nyitvatartás fül

    opening_hours = serializers.DictField(child=DayHoursSerializer())
    exceptions = OpeningHoursExceptionSerializer(many=True, required=False, default=list)

    def validate_opening_hours(self, value):
        # Mind a 7 nap kötelező (monday … sunday)
        missing = [day for day in WEEKDAY_KEYS if day not in value]
        if missing:
            raise serializers.ValidationError(f"Hiányzó napok: {', '.join(missing)}")
        return value

    def save(self):
        opening_hours = self.validated_data["opening_hours"]
        exceptions = self.validated_data.get("exceptions", [])

        # Heti sablon — naponta update_or_create
        for day, data in opening_hours.items():
            WeeklyOpeningHour.objects.update_or_create(
                day=day,
                defaults={
                    "closed": data["closed"],
                    "open_time": None if data["closed"] else _parse_time(data["open"]),
                    "close_time": None if data["closed"] else _parse_time(data["close"]),
                },
            )

        # Kivételek — ami nincs a listában, törlődik (admin eltávolította)
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

        # Másik ablak / főoldal frissüljön — opening-hours.js újratölt
        from sync.services import bump_revision

        bump_revision()
        return build_opening_hours_payload()


def weekly_row_to_dict(row):
    # WeeklyOpeningHour ORM sor → JSON (GET válasz egy napja)
    return {
        "closed": row.closed,
        "open": _format_time(row.open_time),
        "close": _format_time(row.close_time),
    }


def exception_row_to_dict(row):
    # OpeningHoursException ORM sor → JSON
    return {
        "date": row.date.isoformat(),
        "label": row.label,
        "closed": row.closed,
        "open": _format_time(row.open_time),
        "close": _format_time(row.close_time),
    }


def build_opening_hours_payload():
    # GET /api/opening-hours/ válasz — az egész hetet + kivételeket összerakja
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
    # PUT /api/sla-rules/ — dashboard Beállítások SLA fül
    # Mikor legyen piros/sárga egy rendelés vagy foglalás sor (perc / óra küszöbök)

    status_limits = serializers.DictField(child=serializers.IntegerField(min_value=1))
    booking_limits = serializers.DictField(child=serializers.IntegerField(min_value=1))

    def validate_status_limits(self, value):
        # Mind a 4 rendelés-státusz kell: Új, Elfogadva, Készül, Kiszállítás alatt
        from .constants import ORDER_STATUS_LIMIT_KEYS

        missing = [key for key in ORDER_STATUS_LIMIT_KEYS if key not in value]
        if missing:
            raise serializers.ValidationError(f"Hiányzó rendelés státusz: {', '.join(missing)}")
        return value

    def validate_booking_limits(self, value):
        # Foglalás figyelmeztetés mezők — warnNew, problemNew, warnConfirmed
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

        from sync.services import bump_revision

        bump_revision()
        return build_sla_rules_payload()


def build_sla_rules_payload():
    # GET /api/sla-rules/ válasz — APP_STATE / sla-rules.js ebből tölt
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
