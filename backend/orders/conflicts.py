"""
Aktív rendelés ütközések ellenőrzése — user + delivery_date + menütípus (A/B).

Egy vendég ugyanarra a kiszállítási napra, ugyanarra a menütípusra
csak egy folyamatban lévő tétellel rendelkezhet.
"""

from datetime import date

from menu.models import WeeklyMenu

from .constants import ACTIVE_ITEM_STATUSES
from .models import OrderItem

MONTH_LABELS_HU = (
    "jan.",
    "feb.",
    "már.",
    "ápr.",
    "máj.",
    "jún.",
    "júl.",
    "aug.",
    "szept.",
    "okt.",
    "nov.",
    "dec.",
)


def active_item_keys_for_user(user):
    """
    Lekéri a user összes aktív rendelését
    (delivery_date, menu_type) párok az user aktív tételeiből.
    """
    rows = OrderItem.objects.filter(
        order__user=user,
        status__in=ACTIVE_ITEM_STATUSES,
    ).values_list("delivery_date", "weekly_menu__menu_type")
    return set(rows)


def find_order_item_conflicts(user, proposed_items):
    """
   Összeveti a kosárból jövő tételeket a meglévőkkel
    """
    if not proposed_items:
        return []

    existing = active_item_keys_for_user(user)
    wm_ids = [item["weekly_menu"] for item in proposed_items]
    weekly_menus = {
        wm.id: wm
        for wm in WeeklyMenu.objects.filter(id__in=wm_ids)
    }

    conflicts = []
    seen = set()

    for item in proposed_items:
        weekly_menu = weekly_menus.get(item["weekly_menu"])
        if not weekly_menu:
            continue

        key = (item["delivery_date"], weekly_menu.menu_type)
        if key in seen or key in existing:
            if key not in seen:
                conflicts.append(
                    {
                        "delivery_date": item["delivery_date"],
                        "menu_type": weekly_menu.menu_type,
                    }
                )
        seen.add(key)

    conflicts.sort(key=lambda row: (row["delivery_date"], row["menu_type"]))
    return conflicts


def format_delivery_date_hu(value, short=False):
    if isinstance(value, date):
        if short:
            return f"{MONTH_LABELS_HU[value.month - 1]} {value.day}."
        return f"{value.year}. {MONTH_LABELS_HU[value.month - 1]} {value.day}."
    return str(value)


def format_order_conflict_message(conflicts):
    """
    Toast/API hibaüzenet
    """
    if not conflicts:
        return ""

    parts = [
        f"{format_delivery_date_hu(row['delivery_date'], short=True)} {row['menu_type']}"
        for row in conflicts
    ]
    slots = ", ".join(parts)

    if len(conflicts) == 1:
        return f"{slots} menü — már rendeltél, nem került a kosárba."

    return f"Már rendeltél ({slots}) — nem került a kosárba."
