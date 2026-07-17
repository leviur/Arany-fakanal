# Nyitvatartás + SLA — opening_hours/views.py
# Prefix: /api/  (pl. /api/opening-hours/, /api/sla-rules/)

from django.urls import path

from .views import OpeningHoursAPIView, SlaRulesAPIView

urlpatterns = [
    # GET: publikus (opening-hours.js) — PUT: admin Beállítások
    path("opening-hours/", OpeningHoursAPIView.as_view(), name="opening-hours"),
    
    # GET / PUT: dashboard SLA küszöbök (sla-rules.js, settings.js)
    path("sla-rules/", SlaRulesAPIView.as_view(), name="sla-rules"),
]
