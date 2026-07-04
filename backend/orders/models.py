from django.db import models
from django.contrib.auth.models import User
from menu.models import WeeklyMenu

# Create your models here.
class Order(models.Model):

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='orders'
    )
   
    delivery_address = models.TextField()

    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    def __str__(self):
        return f"Order #{self.id}"


class OrderItem(models.Model):

    STATUS_CHOICES = [
        ('new', 'Új'),
        ('confirmed', 'Elfogadva'),
        ('preparing', 'Készül'),
        ('ready', 'Kiszállítás alatt'),
        ('delivered', 'Kézbesítve'),
        ('cancelled', 'Sikertelen kézbesítés'),
    ]

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items'
    )

    weekly_menu = models.ForeignKey(
        WeeklyMenu,
        on_delete=models.PROTECT
    )

    delivery_date = models.DateField()

    # Rendelés tétel leadásának időpontja (automatikusan, nem a kosárból jön)
    created_at = models.DateTimeField(auto_now_add=True)

    quantity = models.PositiveIntegerField(default=1)

    unit_price = models.DecimalField(
        max_digits=8,
        decimal_places=2
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='new'
    )

    def __str__(self):
        return f"{self.weekly_menu} x {self.quantity}"
    