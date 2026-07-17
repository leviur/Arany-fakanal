"""
Itt végezzük a dupla foglalás kiszűrését.
Dupla foglalás kiszűrése — egy nap + időpont elég, nem kell két aktív.

Egy vendégnek csak egy élő foglalása lehet ugyanarra a napra + időpontra (pl. júl. 19. 20:00). Élő = pending vagy confirmed.

Bejelentkezve user_id, vendégként ugyanaz az email számít.
"""

from datetime import date, time

from .constants import ACTIVE_RESERVATION_STATUSES
from .models import Reservation

MONTH_LABELS_HU = (
    "jan.", "feb.", "már.", "ápr.", "máj.", "jún.",
    "júl.", "aug.", "szept.", "okt.", "nov.", "dec.",
)


def _normalize_time(value):
    # Az űrlap "20:00" stringet küld, a DB time objektumot tárol. Összehasonlítás előtt ugyanarra a formára hozza.
    if isinstance(value, time):
        return value
    if isinstance(value, str) and value:
        parts = value.strip().split(":")
        hour = int(parts[0])
        minute = int(parts[1]) if len(parts) > 1 else 0
        return time(hour, minute)
    return value

# megnézi az adatbázisban van-e ilyen aktív foglalás (user, guest e-mail). Ha van → True, különben False
# reservations/serializers.py hívja meg— minden új foglalás POST előtt:
def active_reservation_exists(*, user=None, guest_email=None, reservation_date, reservation_time):
    # pending + confirmed = még élő foglalás
    slot_time = _normalize_time(reservation_time)
    qs = Reservation.objects.filter(
        date=reservation_date,
        time=slot_time,
        status__in=ACTIVE_RESERVATION_STATUSES,
    )

    if user is not None and getattr(user, "is_authenticated", False):
        return qs.filter(user=user).exists()

    if guest_email:
        return qs.filter(guest_email__iexact=guest_email.strip()).exists()

    return False


def format_reservation_conflict_message(reservation_date, reservation_time):
    # ugyanaz a szöveg megy toastba és API hibába: pl. júl. 19. 20:00 — már foglaltál erre az időpontra.
    slot_time = _normalize_time(reservation_time)
    time_label = slot_time.strftime("%H:%M") if isinstance(slot_time, time) else str(reservation_time)

    if isinstance(reservation_date, date):
        date_label = f"{MONTH_LABELS_HU[reservation_date.month - 1]} {reservation_date.day}."
    else:
        date_label = str(reservation_date)

    return f"{date_label} {time_label} — már foglaltál erre az időpontra."
