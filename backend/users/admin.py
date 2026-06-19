from django.contrib import admin
from .models import (
    UserProfile,
    Reservation
)

# Register your models here.
admin.site.register(UserProfile)
admin.site.register(Reservation)