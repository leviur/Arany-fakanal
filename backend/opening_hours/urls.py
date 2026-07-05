from django.urls import path

from .views import OpeningHoursAPIView

urlpatterns = [
    path("opening-hours/", OpeningHoursAPIView.as_view(), name="opening-hours"),
]
