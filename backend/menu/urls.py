from django.urls import path
from .views import (MenuItemListAPIView,
                    # CategoryListAPIView,
                    WeeklyMenuListAPIView,
                    # WeeklyMenuDetailAPIView,
                    # WeeklyMenuCreateAPIView,
                    WeeklyMenuItemListAPIView,
                    WeeklyMenuItemCreateAPIView,

                    )

urlpatterns = [
    path('menu/',
          MenuItemListAPIView.as_view(),
          name='menu-list'),
     
     # uj 2
     # path('categories/',
     #      CategoryListAPIView.as_view(),
     #      name='category-list'),

    # Heti menü listázás + létrehozás 
     path('weekly-menu/',
         WeeklyMenuListAPIView.as_view(),
         name='weekly-menu-list'),

     # uj 5
     # path('weekly-menu/create/',
     #     WeeklyMenuCreateAPIView.as_view(),
     #     name='weekly-menu-create'),

     # uj 4
     # Heti menü részlet + módosítás + törlés (id alapján)
     # path('weekly-menu/<int:pk>/',
     #     WeeklyMenuDetailAPIView.as_view(),
     #     name='weekly-menu-detail'),

    path('weekly-menu-items/',
         WeeklyMenuItemListAPIView.as_view(),
         name='weekly-menu-items'),

    path('weekly-menu-items/create/',
         WeeklyMenuItemCreateAPIView.as_view(),
         name='weekly-menu-item-create'),
    
           
]
