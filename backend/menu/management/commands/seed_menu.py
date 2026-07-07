"""
Demo / fejlesztői parancs: JSON fájlok → étlap adatbázis.

Futtatás: python manage.py seed_menu

Betölti:
  1) allergens.json
  2) categories.json
  3) foods_with_category_and_allergens.json
"""

import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from menu.models import Allergen, Category, MenuItem


def data_dir():
    return settings.BASE_DIR.parent / "frontend" / "static" / "data"


class Command(BaseCommand):
    help = "Állandó étlap betöltése JSON fájlokból az adatbázisba."

    def handle(self, *args, **options):
        allergens_path = data_dir() / "allergens.json"
        categories_path = data_dir() / "categories.json"
        foods_path = data_dir() / "foods_with_category_and_allergens.json"

        for path in (allergens_path, categories_path, foods_path):
            if not path.exists():
                self.stderr.write(self.style.ERROR(f"Nem található: {path}"))
                return

        with allergens_path.open(encoding="utf-8") as handle:
            allergens_data = json.load(handle)

        with categories_path.open(encoding="utf-8") as handle:
            categories_data = json.load(handle)

        with foods_path.open(encoding="utf-8") as handle:
            foods_data = json.load(handle)

        allergen_by_id = {}
        for row in allergens_data:
            allergen, _ = Allergen.objects.update_or_create(
                key=row["key"],
                defaults={
                    "name": row["name"],
                    "icon": row["icon"],
                    "label": row["label"],
                },
            )
            allergen_by_id[row["id"]] = allergen

        category_by_id = {}
        for row in categories_data:
            category, _ = Category.objects.update_or_create(
                name=row["name"],
                defaults={},
            )
            category_by_id[row["id"]] = category

        created_count = 0
        for row in foods_data:
            category = category_by_id[row["category"]["id"]]
            item, created = MenuItem.objects.update_or_create(
                category=category,
                name=row["name"],
                defaults={
                    "description": row.get("description", ""),
                    "price": row["price"],
                    "is_available": True,
                },
            )
            item.allergens.set(
                [allergen_by_id[a["id"]] for a in row.get("allergens", [])]
            )
            if created:
                created_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Étlap szinkronizálva: {len(allergens_data)} allergén, "
                f"{len(categories_data)} kategória, {len(foods_data)} étel "
                f"({created_count} új étel)."
            )
        )
