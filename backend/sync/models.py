from django.db import models


class AppRevision(models.Model):
    """
    Globális verziószám (revision) — mindig egyetlen sor az adatbázisban (pk=1).

    Lánc (röviden):
      1) Valami mentés/törlés → bump_revision()  (sync/services.py)
      2) revision mező nő (pl. 42 → 43)
      3) Böngésző: live-sync.js → poll() → fetchRevision() → GET /api/revision/
      4) Ha a szám változott → onRevisionChanged() újratölti az adatokat

    Nem magát az adatot tárolja, csak „valami változott”  Pl. 42 jelzést.
    """

    revision = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Alkalmazás verzió"
        verbose_name_plural = "Alkalmazás verzió"

    def __str__(self):
        return f"revision {self.revision}"
