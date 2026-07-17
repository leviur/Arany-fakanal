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


class SlaSettings(models.Model):
    """
    Dashboard időkorlátok — egyetlen sor (pk=1).
    Rendelések: státuszonként max. perc (SLA).
    Foglalások: figyelmeztetés / probléma / közelgő küszöbök.
    """

    order_limit_new = models.PositiveIntegerField(default=30)
    order_limit_confirmed = models.PositiveIntegerField(default=45)
    order_limit_preparing = models.PositiveIntegerField(default=60)
    order_limit_ready = models.PositiveIntegerField(default=90)

    booking_warn_new_minutes = models.PositiveIntegerField(default=60)
    booking_problem_new_minutes = models.PositiveIntegerField(default=180)
    booking_warn_confirmed_hours = models.PositiveIntegerField(default=24)

    class Meta:
        verbose_name = "Dashboard SLA beállítások"
        verbose_name_plural = "Dashboard SLA beállítások"

    def __str__(self):
        return "Dashboard SLA"

