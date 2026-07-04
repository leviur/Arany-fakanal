import json
from datetime import date
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from menu.models import WeeklyMenu, WeeklyMenuItem

DAY_TO_DATE = {
    "hetfo": date(2026, 6, 29),
    "kedd": date(2026, 6, 30),
    "szerda": date(2026, 7, 1),
    "csutortok": date(2026, 7, 2),
    "pentek": date(2026, 7, 3),
}

CATEGORY_MAP = {
    "soup": "soup",
    "main": "main",
    "dessert": "dessert",
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

        item_cache = {}

        def get_or_create_item(item_data):
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
            soup = get_or_create_item(menu_data["soup"])
            main_course = get_or_create_item(menu_data["main_course"])
            dessert = get_or_create_item(menu_data["dessert"])

            _, created = WeeklyMenu.objects.update_or_create(
                id=menu_data["id"],
                defaults={
                    "day": DAY_TO_DATE[menu_data["day"]],
                    "menu_type": menu_data["menu_type"],
                    "price": menu_data["price"],
                    "soup": soup,
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
                f"({created_count} új, {len(menus) - created_count} frissítve)."
            )
        )
