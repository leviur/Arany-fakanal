"""
Vendégközpont — rendelés tabok szűrése (Aktív / Lezárt).

Itt az van leírva: mely rendelések számítanak aktívnak a vendégközpontban és a cart.js cache-ben.
"""

from django.db.models import Exists, OuterRef

from orders.constants import ACTIVE_ITEM_STATUSES # new, confirmed, preparing, ready = még folyamatban
from orders.models import OrderItem


def _has_active_items():
    # Van-e a rendelésben olyan tétel, ami még nem delivered / failed?
    return OrderItem.objects.filter(
        order_id=OuterRef("pk"),
        status__in=ACTIVE_ITEM_STATUSES,
    )


def filter_orders_by_scope(queryset, scope):
    # Megmondja, mely rendelések kerüljenek az „Aktív” vagy „Lezárt” listába — tétel státusz alapján, nem a rendelés fejléc alapján.
    if scope == "active":
        return queryset.filter(Exists(_has_active_items())).distinct()

    if scope == "closed":
        # Van tétel, de egyik sem aktív státuszú
        return (
            queryset.filter(items__isnull=False)
            .exclude(Exists(_has_active_items()))
            .distinct()
        )

    return queryset


def count_orders_by_scope(queryset):
    # Tab fejlécekhez: „Aktív (3)” / „Lezárt (12)”
    active = filter_orders_by_scope(queryset, "active").count()
    closed = filter_orders_by_scope(queryset, "closed").count()
    return active, closed
