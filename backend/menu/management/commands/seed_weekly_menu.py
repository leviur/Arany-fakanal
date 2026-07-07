"""
Demo / fejlesztői parancs: weekly_menu.json → adatbázis.

Futtatás: python manage.py seed_weekly_menu

Két táblát tölt:
  1) menu_weeklymenuitem  — katalógus (leves, főétel, desszert nevek)
  2) menu_weeklymenu      — napi A/B menük, FK-kkal a tételekre

Nem az API-n keresztül megy, hanem közvetlenül Django ORM-mal (update_or_create).
Éles üzemben a dashboard API-t használja az admin; ez csak gyors kezdeti adat.
"""

import json
from datetime import date, timedelta
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from menu.models import WeeklyMenu, WeeklyMenuItem

# JSON category → adatbázis category mező
CATEGORY_MAP = {
    "soup": "soup",
    "main": "main",
    "dessert": "dessert",
}


def current_week_day_dates():
    """Az aktuális naptári hét hétfő–péntek dátumai (a dashboard ugyanezt használja)."""
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    return {
        "hetfo": monday,
        "kedd": monday + timedelta(days=1),
        "szerda": monday + timedelta(days=2),
        "csutortok": monday + timedelta(days=3),
        "pentek": monday + timedelta(days=4),
    }


class Command(BaseCommand):
    help = "Heti menü betöltése a frontend weekly_menu.json fájlból az adatbázisba."

    def handle(self, *args, **options):
        json_path = (
            settings.BASE_DIR.parent
            / "frontend"
            / "static"
            / "data"
            / "weekly_menu.json"
        )

        if not json_path.exists():
            self.stderr.write(self.style.ERROR(f"Nem található: {json_path}"))
            return

        with json_path.open(encoding="utf-8") as handle:
            menus = json.load(handle)

        day_to_date = current_week_day_dates()
        item_cache = {}

        def get_or_create_item(item_data):
            """
            WeeklyMenuItem mentése.
            update_or_create: ha van ilyen id → UPDATE, ha nincs → INSERT.
            """
            cache_key = item_data["id"]
            if cache_key in item_cache:
                return item_cache[cache_key]

            item, _ = WeeklyMenuItem.objects.update_or_create(
                id=item_data["id"],
                defaults={
                    "name": item_data["name"],
                    "category": CATEGORY_MAP.get(item_data["category"], "main"),
                    "is_available": item_data.get("is_available", True),
                },
            )
            item_cache[cache_key] = item
            return item

        created_count = 0

        for menu_data in menus:
            # Előbb a 3 katalógus-tétel (FK célpontok)
            soup = get_or_create_item(menu_data["soup"])
            main_course = get_or_create_item(menu_data["main_course"])
            dessert = get_or_create_item(menu_data["dessert"])

            # Aztán a napi menü sor, hivatkozással a tételekre
            _, created = WeeklyMenu.objects.update_or_create(
                id=menu_data["id"],
                defaults={
                    "day": day_to_date[menu_data["day"]],  # pl. "hetfo" → konkrét dátum
                    "menu_type": menu_data["menu_type"],   # "A" vagy "B"
                    "price": menu_data["price"],
                    "soup": soup,           # FK → WeeklyMenuItem
                    "main_course": main_course,
                    "dessert": dessert,
                    "is_available": menu_data.get("is_available", True),
                },
            )

            if created:
                created_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Heti menü szinkronizálva: {len(menus)} menü "
                f"({created_count} új, {len(menus) - created_count} frissítve). "
                f"Aktuális hét: {day_to_date['hetfo']} – {day_to_date['pentek']}."
            )
        )
