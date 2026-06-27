from django.shortcuts import render
from rest_framework import generics
from .models import ContactMessage
from .serializers import (
    ContactMessageSerializer,
    ContactMessageCreateSerializer
)

# Create your views here.
class ContactMessageListAPIView(generics.ListAPIView):

    queryset = ContactMessage.objects.all()
    serializer_class = ContactMessageSerializer

class ContactMessageCreateAPIView(generics.CreateAPIView):

    queryset = ContactMessage.objects.all()
    serializer_class = ContactMessageCreateSerializer