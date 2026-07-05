from django.db.models import F

from .models import AppRevision


def ensure_app_revision():
    """Első használatkor létrehozza az egyetlen revision sort (pk=1)."""
    AppRevision.objects.get_or_create(pk=1)


def get_revision():
    """Aktuális verziószám — a GET /api/revision/ válasza."""
    ensure_app_revision()
    return AppRevision.objects.values_list("revision", flat=True).get(pk=1)


def bump_revision():
    """
    Verzió növelése.
    Minden ilyen növelés után a kliensek ~2 mp-en belül észlelik a változást.
    """
    ensure_app_revision()  #ha még nincs létrehozza az egyetlen AppRevision sort  (pk=1, kezdő revision = 0).
    AppRevision.objects.filter(pk=1).update(revision=F("revision") + 1) #  az adatbázisban atomi módon növeli a számot (pl. 42 → 43). 
