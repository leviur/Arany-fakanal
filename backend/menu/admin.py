from django.contrib import admin
from .models import (
    Category,
    Allergen,
    MenuItem,
    MenuAllergen,
    WeeklyMenu,
    WeeklyMenuItem
)

# Register your models here.
admin.site.register(Category)
admin.site.register(Allergen)
admin.site.register(MenuItem)
admin.site.register(MenuAllergen)
admin.site.register(WeeklyMenu)
admin.site.register(WeeklyMenuItem)