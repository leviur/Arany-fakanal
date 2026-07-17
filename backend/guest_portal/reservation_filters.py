"""
Foglalás tabok: aktív vs lezárt.

Azt határozza meg, mely foglalások aktívak a listában és a frontend cache-ben.

Aktív  = pending vagy confirmed (még  élő foglalás).
Lezárult / lemondva = done vagy cancelled.
"""

from reservations.constants import ACTIVE_RESERVATION_STATUSES

# lezárt tab — done/cancelled
CLOSED_RESERVATION_STATUSES = ("done", "cancelled")


def filter_reservations_by_scope(queryset, scope):
    if scope == "active":
        return queryset.filter(status__in=ACTIVE_RESERVATION_STATUSES)

    if scope == "closed":
        return queryset.filter(status__in=CLOSED_RESERVATION_STATUSES)

    return queryset


def count_reservations_by_scope(queryset):
    """Tab számlálókhoz."""
    active = filter_reservations_by_scope(queryset, "active").count()
    closed = filter_reservations_by_scope(queryset, "closed").count()
    return active, closed
