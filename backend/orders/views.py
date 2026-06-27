from django.shortcuts import render
from rest_framework import generics

from .models import Order
from .serializers import OrderSerializer, OrderCreateSerializer

# Create your views here.
class OrderListAPIView(generics.ListAPIView):

    queryset = Order.objects.all()
    serializer_class = OrderSerializer

class OrderCreateAPIView(generics.CreateAPIView):

    serializer_class = OrderCreateSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context