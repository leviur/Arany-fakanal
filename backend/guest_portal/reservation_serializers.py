"""
Vendégközpont — Foglalásaim API szerializálók.


Üzleti szabály (ugyanaz, mint a lemondásnál):

  A vendég csak „Új” (pending) státuszú foglalást módosíthat / mondhat le.

  Ha az admin már visszaigazolta (confirmed), telefonon vagy e-mailben kell egyeztetni.

"""



from django.utils import timezone
from rest_framework import serializers

from opening_hours.services import validate_reservation_slot
from reservations.models import Reservation
from reservations.serializers import STATUS_API_TO_HU


OCCASION_LABELS = dict(Reservation.OCCASION_CHOICES)



def reservation_is_editable_by_guest(reservation):
    """Még nem vette kézbe az admin — ilyenkor engedjük a szerkesztést és a lemondást."""

    return reservation.status == "pending"



# Alias — a lemondás és a szerkesztés ugyanazon a státuszon múlik
reservation_is_cancellable = reservation_is_editable_by_guest



class GuestReservationSerializer(serializers.ModelSerializer):

    """Lista / válasz — can_edit és can_cancel jelzi a frontendnek, mely gombok jelenjenek meg."""

    status_label = serializers.SerializerMethodField()
    occasion_label = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()

    class Meta:

        model = Reservation
        fields = [
            "id",
            "occasion",
            "occasion_label",
            "guest_name",
            "guest_email",
            "guest_phone",
            "date",
            "time",
            "guest_count",
            "status",
            "status_label",
            "notes",
            "created_at",
            "can_edit",
            "can_cancel",
        ]


    def get_status_label(self, obj):

        return STATUS_API_TO_HU.get(obj.status, obj.status)

    def get_occasion_label(self, obj):

        if not obj.occasion:
            return "—"

        return OCCASION_LABELS.get(obj.occasion, obj.occasion)


    def get_can_edit(self, obj):

        return reservation_is_editable_by_guest(obj)


    def get_can_cancel(self, obj):

        return reservation_is_cancellable(obj)



class GuestReservationUpdateSerializer(serializers.ModelSerializer):

    """
    PATCH /api/guest-portal/reservations/<id>/
    Szerkeszthető mezők — ugyanazok, mint az asztalfoglalás űrlapon (kivéve e-mail).
    Az e-mail nem módosítható: a fiókhoz kötött azonosító.
    """


    guest_phone = serializers.CharField(max_length=20, trim_whitespace=True)
    occasion = serializers.ChoiceField(choices=Reservation.OCCASION_CHOICES)
    guest_count = serializers.IntegerField(min_value=1, max_value=20)
    notes = serializers.CharField(required=False, allow_blank=True, default="")


    class Meta:

        model = Reservation

        fields = [
            "occasion",
            "date",
            "time",
            "guest_count",
            "guest_phone",
            "notes",

        ]

    def validate(self, attrs):

        # Csak pending foglalás — confirmed után admin kezeli
        if not reservation_is_editable_by_guest(self.instance):

            raise serializers.ValidationError(
                "Ez a foglalás már nem módosítható. Kérjük, telefonon vagy e-mailben jelezd a változást."
            )


        # Időpont-ellenőrzés: a PATCH-ben nem minden mező jön — összevonjuk a meglévővel

        reservation_date = attrs.get("date", self.instance.date)
        reservation_time = attrs.get("time", self.instance.time)
        validate_reservation_slot(reservation_date, reservation_time)

        return attrs


    def validate_date(self, value):

        if value < timezone.localdate():
            raise serializers.ValidationError("A foglalás dátuma nem lehet múltbeli!")
        return value


    def validate_occasion(self, value):

        if not value:
            raise serializers.ValidationError("Kérjük, válasszon alkalmat!")
        return value


    def validate_guest_phone(self, value):

        cleaned = value.strip()

        if not cleaned:
            raise serializers.ValidationError("Kérjük, adja meg a telefonszámát!")

        return cleaned


