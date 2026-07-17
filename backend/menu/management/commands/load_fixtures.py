"""
Üres adatbázis feltöltése fixtures-ből (migrate után).

Futtatás: python manage.py load_fixtures
         python manage.py load_fixtures --bootstrap-only
         python manage.py load_fixtures --demo-only
"""

from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "bootstrap.json + demo.json betöltése (étlap, beállítások, tesztadatok)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--bootstrap-only",
            action="store_true",
            help="Csak bootstrap.json (étlap, user, nyitvatartás).",
        )
        parser.add_argument(
            "--demo-only",
            action="store_true",
            help="Csak demo.json (rendelések, foglalások, üzenetek).",
        )

    def handle(self, *args, **options):
        bootstrap_only = options["bootstrap_only"]
        demo_only = options["demo_only"]

        if bootstrap_only and demo_only:
            self.stderr.write("Válassz egyet: --bootstrap-only VAGY --demo-only.")
            return

        if demo_only:
            call_command("loaddata", "demo")
            self.stdout.write(self.style.SUCCESS("demo.json betöltve."))
            return

        call_command("loaddata", "bootstrap")
        self.stdout.write(self.style.SUCCESS("bootstrap.json betöltve."))

        if not bootstrap_only:
            call_command("loaddata", "demo")
            self.stdout.write(self.style.SUCCESS("demo.json betöltve."))

        self.stdout.write(self.style.SUCCESS("Kész."))
