from django.urls import path
from .views import (MenuItemListAPIView, WeeklyMenuListAPIView)

urlpatterns = [
    path('menu/',
          MenuItemListAPIView.as_view(),
          name='menu-list'),

    path('weekly-menu/',
         WeeklyMenuListAPIView.as_view(),
         name='weekly-menu-list'),
]
