"""
Jelenlegi adatbázis → fixtures/*.json

Futtatás: python manage.py export_fixtures

Kimenet:
  fixtures/bootstrap.json  — étlap, heti menü, nyitvatartás, SLA, felhasználók
  fixtures/demo.json       — rendelések, foglalások, üzenetek
"""

from io import StringIO
from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand


def dump_to_fixture(path: Path, *labels: str) -> None:
    buffer = StringIO()
    call_command("dumpdata", *labels, indent=2, stdout=buffer)
    path.write_text(buffer.getvalue(), encoding="utf-8")


class Command(BaseCommand):
    help = "Fixtures exportálása a jelenlegi adatbázisból (bootstrap + demo)."

    def handle(self, *args, **options):
        fixtures_dir = Path(settings.BASE_DIR) / "fixtures"
        fixtures_dir.mkdir(exist_ok=True)

        bootstrap_path = fixtures_dir / "bootstrap.json"
        demo_path = fixtures_dir / "demo.json"

        dump_to_fixture(
            bootstrap_path,
            "menu",
            "opening_hours",
            "auth.user",
            "users",
        )
        self.stdout.write(self.style.SUCCESS(f"Mentve: {bootstrap_path}"))

        dump_to_fixture(demo_path, "orders", "reservations", "contact")
        self.stdout.write(self.style.SUCCESS(f"Mentve: {demo_path}"))

        self.stdout.write(
            "Kész. A fájlok gitbe tehetők; új gépen: migrate, majd load_fixtures."
        )
