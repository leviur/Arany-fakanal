from django.urls import path
from .views import (
    ReservationListView,
    ReservationCreateView
)

urlpatterns = [
    path('', ReservationListView.as_view(), name='reservation-list'),
    path('create/', ReservationCreateView.as_view(), name='reservation-create'),
]
