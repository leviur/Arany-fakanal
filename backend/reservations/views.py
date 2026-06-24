from django.shortcuts import render
from rest_framework import generics
from .models import Reservation
from .serializers import (
    ReservationSerializer,
    ReservationCreateSerializer
)

# Create your views here.
class ReservationListView(generics.ListAPIView):

    queryset = Reservation.objects.all()
    serializer_class = ReservationSerializer

class ReservationCreateView(generics.CreateAPIView):

    serializer_class = ReservationCreateSerializer