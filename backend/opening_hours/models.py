from django.db import models

from .constants import WEEKDAY_KEYS


class WeeklyOpeningHour(models.Model):
    day = models.CharField(max_length=10, choices=[(k, k) for k in WEEKDAY_KEYS], unique=True)
    closed = models.BooleanField(default=False)
    open_time = models.TimeField(null=True, blank=True)
    close_time = models.TimeField(null=True, blank=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.day


class OpeningHoursException(models.Model):
    date = models.DateField(unique=True)
    label = models.CharField(max_length=120, blank=True, default="")
    closed = models.BooleanField(default=True)
    open_time = models.TimeField(null=True, blank=True)
    close_time = models.TimeField(null=True, blank=True)

    class Meta:
        ordering = ["date"]

    def __str__(self):
        return f"{self.date} ({'zárva' if self.closed else 'eltérő'})"
