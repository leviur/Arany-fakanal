from django.shortcuts import render
from rest_framework import generics
from .models import Reservation
from .serializers import (
    ReservationSerializer,
    ReservationCreateSerializer
)

# Create your views here.
class ReservationListAPIView(generics.ListAPIView):

    queryset = Reservation.objects.all()
    serializer_class = ReservationSerializer

class ReservationCreateAPIView(generics.CreateAPIView):

    queryset = Reservation.objects.all()
    serializer_class = ReservationCreateSerializer
