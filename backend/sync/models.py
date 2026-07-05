from django.db import models


class AppRevision(models.Model):
    """
    Globális „verziószám” az alkalmazásban — mindig egyetlen sor (pk=1).

    Ha bármi fontos változik (rendelés, foglalás, nyitvatartás, SLA),
    a revision mező nő. A böngészők 2 mp-enként lekérdezik GET /api/revision/
    és csak akkor töltik újra az adatokat, ha a szám változott.
    """

    revision = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Alkalmazás verzió"
        verbose_name_plural = "Alkalmazás verzió"

    def __str__(self):
        return f"revision {self.revision}"
