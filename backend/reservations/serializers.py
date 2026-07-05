from django.utils import timezone
from rest_framework import serializers

from opening_hours.services import validate_reservation_slot

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
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Kérjük, adja meg a teljes nevét!")
        return cleaned

    def validate_guest_email(self, value):
        cleaned = str(value).strip()
        if not cleaned:
            raise serializers.ValidationError("Kérjük, adja meg az e-mail címét!")
        return cleaned

    def validate_guest_phone(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Kérjük, adja meg a telefonszámát!")
        return cleaned

    def validate_occasion(self, value):
        if not value:
            raise serializers.ValidationError("Kérjük, válasszon alkalmat!")
        return value

    def validate_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError("A foglalás dátuma nem lehet múltbeli!")
        return value

    def validate(self, attrs):
        validate_reservation_slot(attrs["date"], attrs["time"])
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")

        validated_data["status"] = "pending"

        if request and request.user.is_authenticated:
            validated_data["user"] = request.user

        return Reservation.objects.create(**validated_data)


class ReservationUpdateSerializer(serializers.ModelSerializer):
    """Dashboard PATCH — foglalás mezők (státusz: /status/ endpoint)."""

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
