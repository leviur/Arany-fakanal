from django.db import models
from django.contrib.auth.models import User
from menu.models import WeeklyMenu

# Create your models here.
class Order(models.Model):

    STATUS_CHOICES = [
        ('new', 'New'),
        ('confirmed', 'Confirmed'),
        ('preparing', 'Preparing'),
        ('ready', 'Ready'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='orders'
    )
   

    # delivery_date = models.DateField()

    delivery_address = models.TextField()

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='new'
    )

    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order #{self.id}"
    
class OrderItem(models.Model):

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

    quantity = models.PositiveIntegerField(default=1)

    unit_price = models.DecimalField(
        max_digits=8,
        decimal_places=2
    )

    def __str__(self):
        return f"{self.weekly_menu} x {self.quantity}"
    