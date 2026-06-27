from django.urls import path
from .views import (MenuItemListAPIView, WeeklyMenuListAPIView, WeeklyMenuItemListAPIView, WeeklyMenuItemCreateAPIView)

urlpatterns = [
    path('menu/',
          MenuItemListAPIView.as_view(),
          name='menu-list'),

    path('weekly-menu/',
         WeeklyMenuListAPIView.as_view(),
         name='weekly-menu-list'),

    path('weekly-menu-items/',
         WeeklyMenuItemListAPIView.as_view(),
         name='weekly-menu-items'),

    path('weekly-menu-items/create/',
         WeeklyMenuItemCreateAPIView.as_view(),
         name='weekly-menu-item-create'),
    
           
]
