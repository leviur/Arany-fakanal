from django.contrib import admin

from .models import OpeningHoursException, SlaSettings, WeeklyOpeningHour

admin.site.register(WeeklyOpeningHour)
admin.site.register(OpeningHoursException)
admin.site.register(SlaSettings)
