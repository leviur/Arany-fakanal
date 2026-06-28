from django.shortcuts import render
from rest_framework import generics
from .models import MenuItem, WeeklyMenu, WeeklyMenuItem, Category
from .serializers import MenuItemSerializer, WeeklyMenuSerializer, WeeklyMenuItemSerializer
# , CategorySerializer 

# Create your views here.
class MenuItemListAPIView(generics.ListAPIView):
    queryset = MenuItem.objects.filter(is_available=True)
    serializer_class = MenuItemSerializer

# uj
# class CategoryListAPIView(generics.ListAPIView):
#     queryset = Category.objects.all()
#     serializer_class = CategorySerializer

class WeeklyMenuListAPIView(generics.ListAPIView):
    queryset = WeeklyMenu.objects.filter(is_available=True).order_by(
        'day',
        'menu_type')
    serializer_class = WeeklyMenuSerializer

# uj
# class WeeklyMenuDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
#     queryset = WeeklyMenu.objects.all()
#     serializer_class = WeeklyMenuSerializer

# uj
# class WeeklyMenuCreateAPIView(generics.CreateAPIView):
#     queryset = WeeklyMenu.objects.all()
#     serializer_class = WeeklyMenuSerializer

class WeeklyMenuItemListAPIView(generics.ListAPIView):
    queryset = WeeklyMenuItem.objects.filter(is_available=True)
    serializer_class = WeeklyMenuItemSerializer

class WeeklyMenuItemCreateAPIView(generics.CreateAPIView):
    queryset = WeeklyMenuItem.objects.all()
    serializer_class = WeeklyMenuItemSerializer