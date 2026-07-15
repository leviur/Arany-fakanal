"""
Revision (verziószám) szolgáltatások.

Fő függvények:
  bump_revision()  — növeli a számot (mentés/törlés után hívjuk)
  get_revision()   — visszaadja a számot (RevisionAPIView használja)

Frontend oldal: frontend/static/js/live-sync.js
  poll() → fetchRevision() → GET /api/revision/ → get_revision() eredménye
"""

from django.db.models import F

from .models import AppRevision


def ensure_app_revision():
    """Első használatkor létrehozza az egyetlen AppRevision sort (pk=1, revision=0)."""
    AppRevision.objects.get_or_create(pk=1)


def get_revision():
    """
    Aktuális revision szám.
    Hívó: sync/views.py → RevisionAPIView.get()
    """
    ensure_app_revision()
    return AppRevision.objects.values_list("revision", flat=True).get(pk=1)


def bump_revision():
    """
    Revision növelése eggyel.

    Automatikus hívók:
      sync/signals.py → on_dashboard_data_change()  (post_save / post_delete)

    Kézi hívók (QuerySet.update() nem küld signalt):
      orders/views.py, reservations/views.py, opening_hours/serializers.py

    Hatás a frontenden (~2 mp-en belül):
      live-sync.js → poll() észleli → onRevisionChanged() → pl. refreshWeeklyMenu(),
      refreshEtlap(), loadOrdersFromApi(), MenuManager.refresh(), stb.
    """
    ensure_app_revision()
    AppRevision.objects.filter(pk=1).update(revision=F("revision") + 1)
