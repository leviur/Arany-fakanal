"""
Vendégközpont REST útvonalak — regisztrálva: config/urls.py → api/guest-portal/

Rendeléseim + Foglalásaim. 
"""

from django.urls import path

from .reservation_views import (
    GuestReservationCancelAPIView,
    GuestReservationListAPIView,
    GuestReservationUpdateAPIView,
)
from .views import (
    GuestOrderItemDeleteAPIView,
    GuestOrderListAPIView,
    GuestOrderUpdateAPIView,
)

urlpatterns = [
    # GET: vendégközpont rendelések listája (guest-portal/orders.js)
    path("orders/", GuestOrderListAPIView.as_view(), name="guest-portal-order-list"),

    # PATCH: kapcsolati adatok, egy nap A/B qty
    path("orders/<int:pk>/", GuestOrderUpdateAPIView.as_view(), name="guest-portal-order-update"),

    # DELETE: nap-sor lemondás
    path("orders/<int:pk>/items/", GuestOrderItemDeleteAPIView.as_view(), name="guest-portal-order-items-delete"),

    # GET: foglalásaim lista (guest-portal/bookings.js)
    path("reservations/", GuestReservationListAPIView.as_view(), name="guest-portal-reservation-list"),

    # PATCH: foglalás módosítás
    path("reservations/<int:pk>/", GuestReservationUpdateAPIView.as_view(),  name="guest-portal-reservation-update"),

    # POST: lemondás (pending foglalás)
    path("reservations/<int:pk>/cancel/", GuestReservationCancelAPIView.as_view(), name="guest-portal-reservation-cancel"),
]
