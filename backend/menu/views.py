from django.shortcuts import render
from rest_framework import generics
from .models import MenuItem, WeeklyMenu
from .serializers import MenuItemSerializer, WeeklyMenuSerializer

# Create your views here.
class MenuItemListAPIView(generics.ListAPIView):
    queryset = MenuItem.objects.filter(is_available=True)
    serializer_class = MenuItemSerializer

class WeeklyMenuListAPIView(generics.ListAPIView):
    queryset = WeeklyMenu.objects.filter(is_available=True).order_by(
        'day',
        'menu_type')
    serializer_class = WeeklyMenuSerializer
