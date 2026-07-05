from django.contrib import admin

from .models import OpeningHoursException, WeeklyOpeningHour

admin.site.register(WeeklyOpeningHour)
admin.site.register(OpeningHoursException)
