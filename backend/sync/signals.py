"""
Django signalok: INSERT / UPDATE / DELETE után revision++.

Miért kell?
  A legtöbb mentés post_save / post_delete signalt küld → itt hívjuk a bump_revision()-t.
  Kivétel: QuerySet.update() — ott kézzel kell (lásd orders/views.py, reservations/views.py).

Lánc:
  Model.save() vagy .delete()
    → on_dashboard_data_change()  (ez a fájl)
    → bump_revision()             (sync/services.py)
    → live-sync.js poll()         (frontend)
"""

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from orders.models import Order, OrderItem
from reservations.models import Reservation
from contact.models import ContactMessage
from menu.models import Allergen, Category, MenuItem, MenuAllergen, WeeklyMenu, WeeklyMenuItem

from .services import bump_revision


@receiver(post_save, sender=Order)
@receiver(post_save, sender=OrderItem)
@receiver(post_save, sender=Reservation)
@receiver(post_save, sender=ContactMessage)
@receiver(post_save, sender=WeeklyMenu)
@receiver(post_save, sender=WeeklyMenuItem)
@receiver(post_save, sender=Category)
@receiver(post_save, sender=MenuItem)
@receiver(post_save, sender=Allergen)
@receiver(post_save, sender=MenuAllergen)
@receiver(post_delete, sender=Order)
@receiver(post_delete, sender=OrderItem)
@receiver(post_delete, sender=Reservation)
@receiver(post_delete, sender=ContactMessage)
@receiver(post_delete, sender=WeeklyMenu)
@receiver(post_delete, sender=WeeklyMenuItem)
@receiver(post_delete, sender=Category)
@receiver(post_delete, sender=MenuItem)
@receiver(post_delete, sender=Allergen)
@receiver(post_delete, sender=MenuAllergen)
def on_dashboard_data_change(sender, **kwargs):
    """Bármely fenti tábla változása → bump_revision() → live-sync.js frissít."""
    bump_revision()
