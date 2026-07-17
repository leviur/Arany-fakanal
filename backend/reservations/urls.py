# Foglalás API útvonalak — reservations/views.py
# Prefix: /api/reservations/

from django.urls import path

from .views import (
    ReservationCreateAPIView,
    ReservationDetailAPIView,
    ReservationListAPIView,
    ReservationStatusAPIView,
)

urlpatterns = [
    # GET: dashboard táblázat (bookings.js)
    path("", ReservationListAPIView.as_view(), name="reservation-list"),

    # POST: asztalfoglalas.html, guest portal
    path("create/", ReservationCreateAPIView.as_view(), name="reservation-create"),

    # PATCH: csak státusz (dashboard státusz popover) — .update() + bump_revision
    path("<int:pk>/status/", ReservationStatusAPIView.as_view(), name="reservation-status"),
    
    # GET / PATCH / DELETE: egy foglalás (szerkesztő modal, törlés)
    path("<int:pk>/", ReservationDetailAPIView.as_view(), name="reservation-detail"),
]
