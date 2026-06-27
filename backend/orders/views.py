from django.shortcuts import render
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .models import Order
from .serializers import OrderSerializer, OrderCreateSerializer

# Create your views here.
class OrderListAPIView(generics.ListAPIView):

    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(
            user=self.request.user
        )

class OrderCreateAPIView(generics.CreateAPIView):
    
    permission_classes = [IsAuthenticated]
   
    serializer_class = OrderCreateSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context