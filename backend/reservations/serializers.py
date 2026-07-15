"""
Átalakítja a DB adatot JSON-né, amit a frontend kap — és validálja, amit a vendég visszaküld PATCH-nél.
"""

from django.utils import timezone
from rest_framework import serializers

from opening_hours.services import validate_reservation_slot

from .conflicts import active_reservation_exists, format_reservation_conflict_message
from .models import Reservation

STATUS_API_TO_HU = {
    "pending": "Új",
    "confirmed": "Visszaigazolt",
    "cancelled": "Lemondva",
    "done": "Teljesítve",
}

STATUS_HU_TO_API = {label: key for key, label in STATUS_API_TO_HU.items()}


def normalize_reservation_status(value):
    if value in STATUS_API_TO_HU:
        return value
    return STATUS_HU_TO_API.get(value, value)


class ReservationSerializer(serializers.ModelSerializer):
    """Teljes modell — belső/lista"""
    class Meta:
        model = Reservation
        fields = "__all__"


class ReservationCreateSerializer(serializers.ModelSerializer):
    """Publikus foglalás — ugyanazok a szabályok, mint az asztalfoglalas.html űrlapon."""

    guest_name = serializers.CharField(max_length=100, trim_whitespace=True)
    guest_email = serializers.EmailField()
    guest_phone = serializers.CharField(max_length=20, trim_whitespace=True)
    occasion = serializers.ChoiceField(choices=Reservation.OCCASION_CHOICES)
    guest_count = serializers.IntegerField(min_value=1, max_value=20)
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    class Meta:
        model = Reservation
        fields = [
            "guest_name",
            "guest_email",
            "guest_phone",
            "occasion",
            "date",
            "time",
            "guest_count",
            "notes",
        ]

    def validate_guest_name(self, value):
        # guest_name nem lehet üres
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Kérjük, adja meg a teljes nevét!")
        return cleaned

    def validate_guest_email(self, value):
        # guest_email kötelező, érvényes email
        cleaned = str(value).strip()
        if not cleaned:
            raise serializers.ValidationError("Kérjük, adja meg az e-mail címét!")
        return cleaned

    def validate_guest_phone(self, value):
        # guest_phone nem lehet üres
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Kérjük, adja meg a telefonszámát!")
        return cleaned

    def validate_occasion(self, value):
       # occasion kötelező választás
        if not value:
            raise serializers.ValidationError("Kérjük, válasszon alkalmat!")
        return value

    def validate_date(self, value):
        # date nem lehet múltbeli
        if value < timezone.localdate():
            raise serializers.ValidationError("A foglalás dátuma nem lehet múltbeli!")
        return value

    def validate(self, attrs):
        validate_reservation_slot(attrs["date"], attrs["time"]) #  nyitva van-e az étterem, van-e szabad időpont (nyitvatartás)

        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None
        guest_email = attrs.get("guest_email")

        # van-e már pending/confirmed foglalás erre a napra + időre 
        if active_reservation_exists(
            user=user,
            guest_email=guest_email,
            reservation_date=attrs["date"],
            reservation_time=attrs["time"],
        ):
            raise serializers.ValidationError(
                format_reservation_conflict_message(attrs["date"], attrs["time"])
            )

        return attrs

    def create(self, validated_data):
    # akkor fut le, ha a validate() átment
        request = self.context.get("request")

        validated_data["status"] = "pending" # Minden új foglalás pending státusszal jön létre

        if request and request.user.is_authenticated:
            validated_data["user"] = request.user # Bejelentkezve hozzárendeli a user-t is (email mellett)

        return Reservation.objects.create(**validated_data)


class ReservationUpdateSerializer(serializers.ModelSerializer):
    """Dashboard szerkesztés — PATCH"""

    class Meta:
        model = Reservation
        fields = [
            "guest_name",
            "guest_email",
            "guest_phone",
            "occasion",
            "date",
            "time",
            "guest_count",
            "notes",
        ]

    def validate_occasion(self, value):
        return value or None
