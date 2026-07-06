"""
Django signalok: rendelés / foglalás mentés vagy törlés → revision++.

Így nem kell minden view-ban külön hívni a bump_revision()-t,
kivéve ahol QuerySet.update() fut (az nem küld signalt — lásd orders/views, reservations/views).
"""

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from orders.models import Order, OrderItem
from reservations.models import Reservation

from contact.models import ContactMessage

from .services import bump_revision


@receiver(post_save, sender=Order)
@receiver(post_save, sender=OrderItem)
@receiver(post_save, sender=Reservation)
@receiver(post_save, sender=ContactMessage)
@receiver(post_delete, sender=Order)
@receiver(post_delete, sender=OrderItem)
@receiver(post_delete, sender=Reservation)
@receiver(post_delete, sender=ContactMessage)
def on_dashboard_data_change(sender, **kwargs):
    bump_revision()
