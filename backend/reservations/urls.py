from django.urls import path

from .views import (
    ReservationCreateAPIView,
    ReservationDetailAPIView,
    ReservationListAPIView,
    ReservationStatusAPIView,
)

urlpatterns = [
    path("", ReservationListAPIView.as_view(), name="reservation-list"),
    path("create/", ReservationCreateAPIView.as_view(), name="reservation-create"),
    path("<int:pk>/status/", ReservationStatusAPIView.as_view(), name="reservation-status"),
    path("<int:pk>/", ReservationDetailAPIView.as_view(), name="reservation-detail"),
]
