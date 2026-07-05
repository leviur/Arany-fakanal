from django.urls import path

from .views import OpeningHoursAPIView, SlaRulesAPIView

urlpatterns = [
    path("opening-hours/", OpeningHoursAPIView.as_view(), name="opening-hours"),
    path("sla-rules/", SlaRulesAPIView.as_view(), name="sla-rules"),
]
