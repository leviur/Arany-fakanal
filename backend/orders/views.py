from django.shortcuts import render
from rest_framework import generics

from .models import Order
from .serializers import OrderSerializer, OrderCreateSerializer

# Create your views here.
class OrderListView(generics.ListAPIView):

    queryset = Order.objects.all()
    serializer_class = OrderSerializer

class OrderCreateView(generics.CreateAPIView):

    serializer_class = OrderCreateSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context